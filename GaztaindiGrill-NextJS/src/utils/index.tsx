import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { ProgramStep } from "../../types"
import { Thermometer, MoveVertical, RotateCw, Clock, } from "lucide-react"
import { ReactNode } from "react"

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

// Convert various date strings to an <input type="date"> value (YYYY-MM-DD)
export const toDateInputValue = (input?: string | number): string => {
  if (input == null || input === '') return ''
  const pad = (n: number) => String(n).padStart(2, '0')

  // If already YYYY-MM-DD, return as-is
  const asString = String(input)
  if (/^\d{4}-\d{2}-\d{2}$/.test(asString)) return asString

  // Try to parse with Date
  const d = new Date(asString)
  if (isNaN(d.getTime())) return ''
  const yyyy = d.getFullYear()
  const mm = pad(d.getMonth() + 1)
  const dd = pad(d.getDate())
  return `${yyyy}-${mm}-${dd}`
}

// From date input value back to a string to send to API (keep YYYY-MM-DD)
export const fromDateInputValue = (val?: string): string | undefined => {
  if (!val) return undefined
  // Keep as YYYY-MM-DD (most APIs accept DATE columns like this)
  return val
}


export const getStepIcon = (step: ProgramStep) => {
  if (step.temperature != null) return (<Thermometer className="h-4 w-4 flex-shrink-0" />);
  if (step.position != null) return <MoveVertical className="h-4 w-4 flex-shrink-0" />;
  if (step.rotation != null) return <RotateCw className="h-4 w-4 flex-shrink-0" />;
  return <Clock className="h-4 w-4 flex-shrink-0" />; // Default or time-only steps
};


export const getStepDescription = (step: ProgramStep): ReactNode => {
  if (step.temperature) {
    return (
      <div className="leading-tight">
        <div><span className="font-medium">Temperatura:</span> {step.temperature}°C</div>
        <div><span className="font-medium">Tiempo:</span> {formatSeconds(step.time as number)}</div>
      </div>
    )
  }
  if (step.position) {
    return (
      <div className="leading-tight">
        <div><span className="font-medium">Posición:</span> {step.position}</div>
        <div><span className="font-medium">Tiempo:</span> {formatSeconds(step.time as number)}</div>
      </div>
    )
  }
  if (step.rotation) {
    return (
      <div className="leading-tight">
        <div><span className="font-medium">Inclinación:</span> {step.rotation}°</div>
        <div><span className="font-medium">Tiempo:</span> {formatSeconds(step.time as number)}</div>
      </div>
    )
  }
  return <div className="leading-tight">Paso desconocido</div>
}