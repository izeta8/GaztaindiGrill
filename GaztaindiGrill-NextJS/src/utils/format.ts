export const truncate = (text?: string, max = 140): string => {
  if (!text) return ""
  return text.length > max ? `${text.slice(0, max)}…` : text
}

export const formatSeconds = (seconds?: number): string => {
  if (seconds == null || !Number.isFinite(seconds)) return "-"
  if (seconds > 60) {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}m ${s}s`
  }
  return `${seconds}s`
}
