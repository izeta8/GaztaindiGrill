import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { ProgramStep } from "@/lib/types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const truncate = (text?: string, max = 140): string => {
  if (!text) return ""
  return text.length > max ? `${text.slice(0, max)}…` : text
}

export const formatDate = (value?: string): string => {
  if (!value) return "-"
  const d = new Date(value)
  if (isNaN(d.getTime())) return value
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`
}

export const parseSteps = (stepsJson: string): ProgramStep[] => {
  try {
    const parsed = JSON.parse(stepsJson)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
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
