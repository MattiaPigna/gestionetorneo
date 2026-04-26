export function calcSlotTime(config, slotIdx) {
  if (config.slotTimes?.[slotIdx]) return config.slotTimes[slotIdx]
  const [h, m] = (config.startTime || '09:00').split(':').map(Number)
  const total = h * 60 + m + slotIdx * (config.slotIntervalMinutes || 90)
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

export function timeToMinutes(timeStr) {
  const [h, m] = (timeStr || '00:00').split(':').map(Number)
  return h * 60 + (m || 0)
}

export function minutesToLabel(mins) {
  if (mins < 60) return `${mins}min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m === 0 ? `${h}h` : `${h}h ${m}min`
}
