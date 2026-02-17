import type { ProgramStep } from "@/types"
import { Thermometer, MoveVertical, RotateCw, Clock, } from "lucide-react"
import { ReactNode } from "react"
import { formatSeconds } from "./format"

export const parseSteps = (stepsJson: string): ProgramStep[] => {
  try {
    const parsed = JSON.parse(stepsJson)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
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
