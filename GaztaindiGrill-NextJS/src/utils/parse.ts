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

// Clock style (m:ss, or h:mm:ss past an hour) for a counter that ticks every second.
export const formatDuration = (seconds: number): string => {
  const pad = (n: number) => String(n).padStart(2, "0")
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`
}

export const parseGrillIndex = (topic: string): (undefined | 0 | 1) => {

  const grillIndexMatch = topic.match(/grill\/(\d+)\//);
  if (!grillIndexMatch) return;

  const grillIndex = parseInt(grillIndexMatch[1], 10);
  if (isNaN(grillIndex) || (grillIndex !== 0 && grillIndex !== 1)) return;

  return grillIndex
}
