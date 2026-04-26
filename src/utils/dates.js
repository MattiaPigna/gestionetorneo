const DAYS_SHORT  = ['Dom','Lun','Mar','Mer','Gio','Ven','Sab']
const MONTHS_SHORT = ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic']
const MONTHS_FULL  = ['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno',
                      'Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre']

function parse(str) { return new Date(str + 'T00:00:00') }

// 0=Lun … 6=Dom (Italian convention)
export function dowMon(dateStr) {
  return (parse(dateStr).getDay() + 6) % 7
}

export function computePlayingDays(startDate, endDate, excludedDates = []) {
  if (!startDate || !endDate) return []
  const excluded = new Set(excludedDates)
  const days = []
  const cur = parse(startDate)
  const end = parse(endDate)
  if (cur > end) return []
  while (cur <= end) {
    const s = cur.toISOString().split('T')[0]
    if (!excluded.has(s)) days.push(s)
    cur.setDate(cur.getDate() + 1)
  }
  return days
}

export function allDatesInRange(startDate, endDate) {
  if (!startDate || !endDate) return []
  const dates = []
  const cur = parse(startDate)
  const end = parse(endDate)
  if (cur > end) return []
  while (cur <= end) {
    dates.push(cur.toISOString().split('T')[0])
    cur.setDate(cur.getDate() + 1)
  }
  return dates
}

export function formatDateShort(dateStr) {
  const d = parse(dateStr)
  return `${DAYS_SHORT[d.getDay()]} ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`
}

export function formatDateFull(dateStr) {
  const d = parse(dateStr)
  return `${DAYS_SHORT[d.getDay()]} ${d.getDate()} ${MONTHS_FULL[d.getMonth()]} ${d.getFullYear()}`
}

export function getMonthLabel(dateStr) {
  const d = parse(dateStr)
  return `${MONTHS_FULL[d.getMonth()]} ${d.getFullYear()}`
}

// Returns cells for a full calendar grid starting from Monday of first week
export function buildCalendarCells(datesInRange, allRangeDates) {
  if (!datesInRange.length) return []
  const allSet = new Set(allRangeDates)

  const firstDow = dowMon(datesInRange[0])
  const startCal = parse(datesInRange[0])
  startCal.setDate(startCal.getDate() - firstDow)

  const lastDow = dowMon(datesInRange[datesInRange.length - 1])
  const endCal = parse(datesInRange[datesInRange.length - 1])
  endCal.setDate(endCal.getDate() + (6 - lastDow))

  const cells = []
  const cur = new Date(startCal)
  while (cur <= endCal) {
    const s = cur.toISOString().split('T')[0]
    cells.push({ dateStr: s, inRange: allSet.has(s) })
    cur.setDate(cur.getDate() + 1)
  }
  return cells
}
