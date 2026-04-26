import { createContext, useContext, useReducer } from 'react'
import { calcSlotTime, timeToMinutes } from '../utils/time'
import { resolveAllMatches } from '../utils/placeholders'
import { computePlayingDays, formatDateShort } from '../utils/dates'

const TEAM_COLORS = [
  '#3B82F6','#EF4444','#10B981','#F59E0B',
  '#8B5CF6','#EC4899','#06B6D4','#84CC16',
  '#F97316','#14B8A6','#6366F1','#F43F5E',
]

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

export function generateId() {
  return Math.random().toString(36).slice(2, 9)
}

// ─── Match generation ──────────────────────────────────────────────────────

function roundName(size) {
  if (size === 2) return 'Finale'
  if (size === 4) return 'Semifinale'
  if (size === 8) return 'Quarti di Finale'
  if (size === 16) return 'Ottavi di Finale'
  return `Round ${size}`
}

function nextPow2(n) {
  let p = 1
  while (p < n) p *= 2
  return p
}

export function generateMatchesFromFormat(teams, format) {
  const matches = []
  const { type } = format

  // ── Girone unico ──
  if (type === 'roundrobin') {
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        matches.push({
          id: generateId(),
          team1Id: teams[i].id,
          team2Id: teams[j].id,
          label: `P${matches.length + 1}`,
          round: 'Girone',
          phase: 'group',
          bracket: null,
        })
      }
    }
    return matches
  }

  // ── N gironi (+ opzionale fase finale) ──
  if (type === 'groups' || type === 'groups_knockout') {
    const { numGroups = 2, advancePerGroup = 2, hasThirdPlace = true } = format
    const total = teams.length
    const baseSize = Math.floor(total / numGroups)
    const extra = total % numGroups          // first `extra` groups get one more team

    let teamIdx = 0
    const groupList = []

    for (let g = 0; g < numGroups; g++) {
      const size = baseSize + (g < extra ? 1 : 0)
      const groupTeams = teams.slice(teamIdx, teamIdx + size)
      teamIdx += size
      const gName = `Girone ${LETTERS[g]}`
      groupList.push({ name: gName, teams: groupTeams })

      for (let i = 0; i < groupTeams.length; i++) {
        for (let j = i + 1; j < groupTeams.length; j++) {
          matches.push({
            id: generateId(),
            team1Id: groupTeams[i].id,
            team2Id: groupTeams[j].id,
            label: `${LETTERS[g]}${matches.filter(m => m.round === gName).length + 1}`,
            round: gName,
            phase: 'group',
            bracket: null,
          })
        }
      }
    }

    // ── Fase finale ──
    if (type === 'groups_knockout') {
      const advancing = numGroups * advancePerGroup
      const bracketSize = nextPow2(advancing)
      let currentSize = bracketSize
      let roundIdx = 0

      while (currentSize > 1) {
        const rName = roundName(currentSize)
        for (let i = 0; i < currentSize / 2; i++) {
          let p1 = '', p2 = ''
          if (roundIdx === 0) {
            // Label qualificates from groups (criss-cross pairing)
            const slot1 = i
            const slot2 = advancing - 1 - i
            const g1 = slot1 % numGroups
            const pos1 = Math.floor(slot1 / numGroups) + 1
            const g2 = slot2 % numGroups
            const pos2 = Math.floor(slot2 / numGroups) + 1
            p1 = `${pos1}° ${LETTERS[g1]}`
            p2 = `${pos2}° ${LETTERS[g2]}`
          } else {
            const base = Math.floor(i * 2)
            p1 = `Vin. ${roundName(currentSize * 2)} M${base + 1}`
            p2 = `Vin. ${roundName(currentSize * 2)} M${base + 2}`
          }
          matches.push({
            id: generateId(),
            team1Id: null, team2Id: null,
            label: `${rName.slice(0, 2).toUpperCase()}${i + 1}`,
            round: rName,
            phase: 'knockout',
            bracket: 'knockout',
            placeholder1: p1,
            placeholder2: p2,
          })
        }
        currentSize /= 2
        roundIdx++
      }

      if (hasThirdPlace && advancing >= 4) {
        matches.push({
          id: generateId(),
          team1Id: null, team2Id: null,
          label: '3°P',
          round: '3° Posto',
          phase: 'knockout',
          bracket: 'knockout',
          placeholder1: 'Perd. Semifinale M1',
          placeholder2: 'Perd. Semifinale M2',
        })
      }
    }
    return matches
  }

  // ── Eliminazione diretta pura ──
  if (type === 'knockout') {
    const { hasThirdPlace = true, seeded = false } = format
    const orderedTeams = seeded ? [...teams] : shuffleArray([...teams])
    const bracketSize = nextPow2(orderedTeams.length)
    const byes = bracketSize - orderedTeams.length
    // Fill with nulls for byes
    const bracket = [
      ...orderedTeams,
      ...Array(byes).fill(null),
    ]

    let currentRound = bracket.map((t, i) => ({ team: t, seed: i + 1 }))
    let currentSize = bracketSize
    let roundIdx = 0

    while (currentSize > 1) {
      const rName = roundName(currentSize)
      const nextRound = []
      for (let i = 0; i < currentSize; i += 2) {
        const a = currentRound[i]
        const b = currentRound[i + 1]
        // If one is a bye, auto-advance
        if (!a?.team && !b?.team) {
          nextRound.push({ team: null, seed: null })
          continue
        }
        if (!b?.team) {
          // a gets a bye
          nextRound.push(a)
          continue
        }
        if (!a?.team) {
          nextRound.push(b)
          continue
        }
        matches.push({
          id: generateId(),
          team1Id: a.team.id,
          team2Id: b.team.id,
          label: `${rName.slice(0, 2).toUpperCase()}${Math.floor(i / 2) + 1}`,
          round: rName,
          phase: 'knockout',
          bracket: 'knockout',
          placeholder1: null,
          placeholder2: null,
        })
        nextRound.push({ team: { id: `winner_${matches[matches.length - 1].id}` }, seed: null })
      }
      currentRound = nextRound
      currentSize /= 2
      roundIdx++
    }

    if (hasThirdPlace && orderedTeams.length >= 4) {
      matches.push({
        id: generateId(),
        team1Id: null, team2Id: null,
        label: '3°P',
        round: '3° Posto',
        phase: 'knockout',
        bracket: 'knockout',
        placeholder1: 'Perd. Semifinale M1',
        placeholder2: 'Perd. Semifinale M2',
      })
    }
    return matches
  }

  return matches
}

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

// ─── Violations ────────────────────────────────────────────────────────────

function dayLabel(dayIdx, config) {
  return config.playingDays?.[dayIdx]
    ? formatDateShort(config.playingDays[dayIdx])
    : `Giorno ${dayIdx + 1}`
}

function computeViolations(schedule, matches, teams, constraints, config) {
  const violations = []
  const matchMap = Object.fromEntries(matches.map(m => [m.id, m]))
  const teamMap = Object.fromEntries(teams.map(t => [t.id, t]))
  const matchDuration = config?.matchDurationMinutes || 60

  const teamDaySlots = {}
  Object.entries(schedule).forEach(([key, matchId]) => {
    const m = key.match(/d(\d+)-s(\d+)/)
    if (!m) return
    const day = parseInt(m[1])
    const slot = parseInt(m[2])
    const match = matchMap[matchId]
    if (!match) return
    ;[match.team1Id, match.team2Id].forEach(tid => {
      if (!tid) return
      if (!teamDaySlots[tid]) teamDaySlots[tid] = {}
      if (!teamDaySlots[tid][day]) teamDaySlots[tid][day] = []
      teamDaySlots[tid][day].push({ slot, matchId })
    })
  })

  Object.entries(teamDaySlots).forEach(([tid, dayMap]) => {
    const teamName = teamMap[tid]?.name || tid
    Object.entries(dayMap).forEach(([day, entries]) => {
      if (!constraints.allowDoubleDay && entries.length > 1) {
        violations.push({
          type: 'double_day',
          severity: 'error',
          matchIds: entries.map(e => e.matchId),
          message: `${teamName} gioca ${entries.length}× il ${dayLabel(parseInt(day), config)} (doppio vietato)`,
        })
      }
      if (entries.length > 1 && constraints.minRestMinutes > 0) {
        const sorted = [...entries].sort((a, b) => a.slot - b.slot)
        for (let i = 0; i < sorted.length - 1; i++) {
          const t1 = timeToMinutes(calcSlotTime(config, sorted[i].slot))
          const t2 = timeToMinutes(calcSlotTime(config, sorted[i + 1].slot))
          // rest = gap between slot starts minus match duration
          const restMinutes = t2 - t1 - matchDuration
          if (restMinutes < constraints.minRestMinutes) {
            const restLabel = restMinutes <= 0 ? 'sovrapposizione' : `${restMinutes}min`
            violations.push({
              type: 'min_rest',
              severity: restMinutes <= 0 ? 'error' : 'warning',
              matchIds: [sorted[i].matchId, sorted[i + 1].matchId],
              message: `${teamName}: riposo ${restLabel} il ${dayLabel(parseInt(day), config)} (min: ${constraints.minRestMinutes}min)`,
            })
          }
        }
      }
    })
  })

  const matchesPerDay = {}
  Object.keys(schedule).forEach(key => {
    const m = key.match(/d(\d+)-s(\d+)/)
    if (!m) return
    const day = parseInt(m[1])
    matchesPerDay[day] = (matchesPerDay[day] || 0) + 1
  })
  Object.entries(matchesPerDay).forEach(([day, count]) => {
    if (count > constraints.maxMatchesPerDay) {
      violations.push({
        type: 'max_per_day',
        severity: 'error',
        matchIds: [],
        message: `${dayLabel(parseInt(day), config)}: ${count} partite (max ${constraints.maxMatchesPerDay})`,
      })
    }
  })

  return violations
}

// ─── Initial State ──────────────────────────────────────────────────────────

const initialState = {
  step: 'dashboard',
  savedId: null,   // server ID of the currently loaded/saved tournament
  config: {
    name: 'Il Mio Torneo',
    numDays: 6,
    sport: 'Calcio',
    matchDurationMinutes: 60,
    startTime: '09:00',
    slotIntervalMinutes: 90,
    slotsPerDay: 8,
    slotTimes: {},
    startDate: '',
    endDate: '',
    excludedDates: [],
    playingDays: [],   // computed from startDate/endDate/excludedDates
  },
  format: {
    type: 'groups_knockout',
    numGroups: 2,
    advancePerGroup: 2,
    hasThirdPlace: true,
    seeded: false,
  },
  constraints: {
    allowDoubleDay: false,
    maxMatchesPerDay: 4,
    minRestMinutes: 60,   // minimum rest in minutes between matches for same team
  },
  teams: [],
  matches: [],
  schedule: {},
  violations: [],
}

// ─── Reducer ────────────────────────────────────────────────────────────────

function reducer(state, action) {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, step: action.payload }

    case 'UPDATE_CONFIG': {
      const newConfig = { ...state.config, ...action.payload }
      if ('startDate' in action.payload || 'endDate' in action.payload || 'excludedDates' in action.payload) {
        const days = computePlayingDays(newConfig.startDate, newConfig.endDate, newConfig.excludedDates)
        newConfig.playingDays = days
        if (days.length > 0) newConfig.numDays = days.length
      }
      return { ...state, config: newConfig }
    }

    case 'UPDATE_FORMAT':
      return { ...state, format: { ...state.format, ...action.payload } }

    case 'UPDATE_CONSTRAINTS':
      return { ...state, constraints: { ...state.constraints, ...action.payload } }

    case 'SET_TEAMS': {
      const teams = action.payload
        .map((name, i) => ({ id: generateId(), name: name.trim(), color: TEAM_COLORS[i % TEAM_COLORS.length] }))
        .filter(t => t.name)
      return { ...state, teams }
    }

    case 'ADD_TEAM': {
      const idx = state.teams.length
      return {
        ...state,
        teams: [...state.teams, { id: generateId(), name: action.payload, color: TEAM_COLORS[idx % TEAM_COLORS.length] }],
      }
    }

    case 'REMOVE_TEAM':
      return { ...state, teams: state.teams.filter(t => t.id !== action.payload) }

    case 'UPDATE_TEAM_COLOR':
      return {
        ...state,
        teams: state.teams.map(t => t.id === action.payload.id ? { ...t, color: action.payload.color } : t),
      }

    case 'GENERATE_MATCHES': {
      const format = action.payload || state.format
      const matches = generateMatchesFromFormat(state.teams, format)
      return { ...state, format, matches, schedule: {}, violations: [] }
    }

    case 'SET_MATCHES_FROM_TEXT': {
      const resolved = resolveAllMatches(action.payload)
      return { ...state, matches: resolved, schedule: {}, violations: [] }
    }

    case 'SET_RESULT': {
      const { matchId, score1, score2 } = action.payload
      const s1 = score1 === '' ? null : parseInt(score1)
      const s2 = score2 === '' ? null : parseInt(score2)
      const played = s1 !== null && s2 !== null && !isNaN(s1) && !isNaN(s2)

      const updated = state.matches.map(m => {
        if (m.id !== matchId) return m
        const t1 = m.team1Id || m.resolvedTeam1Id
        const t2 = m.team2Id || m.resolvedTeam2Id
        let winnerId = null, loserId = null
        if (played && t1 && t2) {
          if (s1 > s2)      { winnerId = t1; loserId = t2 }
          else if (s2 > s1) { winnerId = t2; loserId = t1 }
          // draw → no winner
        }
        return {
          ...m,
          result: { score1, score2, winnerId, loserId, status: played ? 'played' : 'pending' },
        }
      })
      const resolved = resolveAllMatches(updated)
      return { ...state, matches: resolved }
    }

    case 'SET_SLOT_TIME': {
      const { slotIdx, time } = action.payload
      const slotTimes = { ...(state.config.slotTimes || {}) }
      if (time === null) {
        delete slotTimes[slotIdx]
      } else {
        slotTimes[slotIdx] = time
      }
      return { ...state, config: { ...state.config, slotTimes } }
    }

    case 'PLACE_MATCH': {
      const { matchId, dayIdx, slotIdx } = action.payload
      const key = `d${dayIdx}-s${slotIdx}`
      const newSchedule = { ...state.schedule }
      // Remove from old position
      Object.entries(newSchedule).forEach(([k, v]) => { if (v === matchId) delete newSchedule[k] })
      // Swap if occupied
      if (newSchedule[key] && newSchedule[key] !== matchId) {
        const displaced = newSchedule[key]
        const oldKey = Object.entries(state.schedule).find(([, v]) => v === matchId)?.[0]
        if (oldKey) newSchedule[oldKey] = displaced
        else delete newSchedule[key]
      }
      newSchedule[key] = matchId
      return { ...state, schedule: newSchedule, violations: computeViolations(newSchedule, state.matches, state.teams, state.constraints, state.config) }
    }

    case 'UNSCHEDULE_MATCH': {
      const newSchedule = { ...state.schedule }
      Object.entries(newSchedule).forEach(([k, v]) => { if (v === action.payload) delete newSchedule[k] })
      return { ...state, schedule: newSchedule, violations: computeViolations(newSchedule, state.matches, state.teams, state.constraints, state.config) }
    }

    case 'CLEAR_SCHEDULE':
      return { ...state, schedule: {}, violations: [] }

    case 'AUTO_SCHEDULE': {
      const { matches, constraints, config } = state
      const schedule = {}
      const teamDayCount = {}

      const sorted = [...matches].sort((a, b) => {
        if (a.phase === 'knockout' && b.phase !== 'knockout') return 1
        if (a.phase !== 'knockout' && b.phase === 'knockout') return -1
        return 0
      })

      for (const match of sorted) {
        if (match.bracket === 'knockout' && !match.team1Id) continue
        let placed = false
        for (let d = 0; d < config.numDays && !placed; d++) {
          for (let s = 0; s < config.slotsPerDay && !placed; s++) {
            const key = `d${d}-s${s}`
            if (schedule[key]) continue
            const dayCount = Object.keys(schedule).filter(k => k.startsWith(`d${d}-`)).length
            if (dayCount >= constraints.maxMatchesPerDay) continue

            if (!teamDayCount[d]) teamDayCount[d] = {}
            const t1c = teamDayCount[d][match.team1Id] || 0
            const t2c = teamDayCount[d][match.team2Id] || 0
            if (!constraints.allowDoubleDay && (t1c > 0 || t2c > 0)) continue

            let restOk = true
            const matchDuration = config.matchDurationMinutes || 60
            if (constraints.minRestMinutes > 0) {
              const thisSlotMin = timeToMinutes(calcSlotTime(config, s))
              for (const [sk, mid] of Object.entries(schedule)) {
                const sm = sk.match(/d(\d+)-s(\d+)/)
                if (!sm) continue
                const sd = parseInt(sm[1]), ss = parseInt(sm[2])
                if (sd !== d) continue
                const pm = matches.find(m => m.id === mid)
                if (!pm) continue
                const teamsOverlap =
                  pm.team1Id === match.team1Id || pm.team1Id === match.team2Id ||
                  pm.team2Id === match.team1Id || pm.team2Id === match.team2Id
                if (!teamsOverlap) continue
                const otherSlotMin = timeToMinutes(calcSlotTime(config, ss))
                const rest = Math.abs(thisSlotMin - otherSlotMin) - matchDuration
                if (rest < constraints.minRestMinutes) { restOk = false; break }
              }
            }
            if (!restOk) continue

            schedule[key] = match.id
            if (match.team1Id) teamDayCount[d][match.team1Id] = (teamDayCount[d][match.team1Id] || 0) + 1
            if (match.team2Id) teamDayCount[d][match.team2Id] = (teamDayCount[d][match.team2Id] || 0) + 1
            placed = true
          }
        }
      }

      return { ...state, schedule, violations: computeViolations(schedule, matches, state.teams, state.constraints, config) }
    }

    case 'SET_SAVED_ID':
      return { ...state, savedId: action.payload }

    case 'LOAD_STATE':
      return {
        ...initialState,
        ...action.payload,
        step: 'build',
        violations: action.payload.violations || [],
        savedId: action.payload.savedId ?? null,
      }

    case 'RESET':
      return { ...initialState }

    default:
      return state
  }
}

// ─── Context ─────────────────────────────────────────────────────────────────

const TournamentContext = createContext(null)

export function TournamentProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  return (
    <TournamentContext.Provider value={{ state, dispatch }}>
      {children}
    </TournamentContext.Provider>
  )
}

export function useTournament() {
  return useContext(TournamentContext)
}
