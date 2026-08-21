"use client"

import { Clock, MoveVertical, RotateCw, Target, Thermometer } from "lucide-react"
import { Modal } from "@/components/ui/Modal"
import { Button } from "@/components/ui/Button"
import type { Program, ProgramStep } from "@/types"
import { formatSeconds } from "@/utils"
import type { ReactNode } from "react"

interface Props {
  isOpen: boolean
  onClose: () => void
  program: Program | null
  steps: ProgramStep[]
}

const getStepIcon = (step: ProgramStep) => {
  if (step.action) return <Target className="h-5 w-5" />
  if (step.temperature != null) return <Thermometer className="h-6 w-6" />
  if (step.position != null) return <MoveVertical className="h-5 w-5" />
  if (step.rotation != null) return <RotateCw className="h-5 w-5" />
  return <Clock className="h-5 w-5" />
}

const getStepDescription = (step: ProgramStep): ReactNode => {
  if (step.action) {
    const actionLabels: Record<string, string> = {
      rotate_90: 'Girar 90°',
      rotate_180: 'Girar 180°',
      move_up: 'Subir arriba',
      move_down: 'Bajar abajo',
      reset_position: 'Resetear posición',
    }
    return (
      <div className="leading-tight">
        <div><span className="font-medium">Acción:</span> {actionLabels[step.action] ?? step.action}</div>
      </div>
    )
  }
  if (step.temperature != null) {
    return (
      <div className="leading-tight">
        <div><span className="font-medium">Temperatura:</span> {step.temperature}°C</div>
        {step.time != null && (
          <div><span className="font-medium">Tiempo:</span> {formatSeconds(step.time)}</div>
        )}
      </div>
    )
  }
  if (step.position != null) {
    return (
      <div className="leading-tight">
        <div><span className="font-medium">Posición:</span> {step.position}</div>
        {step.time != null && (
          <div><span className="font-medium">Tiempo:</span> {formatSeconds(step.time)}</div>
        )}
      </div>
    )
  }
  if (step.rotation != null) {
    return (
      <div className="leading-tight">
        <div><span className="font-medium">Inclinación:</span> {step.rotation}°</div>
        {step.time != null && (
          <div><span className="font-medium">Tiempo:</span> {formatSeconds(step.time)}</div>
        )}
      </div>
    )
  }
  return <div className="leading-tight">Paso desconocido</div>
}

export function StepsModal({ isOpen, onClose, program, steps }: Props) {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {program ? `Pasos: ${program.name}` : 'Pasos del programa'}
        </h3>

        {steps.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Clock className="h-10 w-10 mx-auto mb-3 text-gray-300" />
            Este programa no tiene pasos
          </div>
        ) : (
          <div className="space-y-3 max-h-[60vh] overflow-auto pr-1">
            {steps.map((step, index) => (
              <div key={index} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
                <span className="text-xs text-gray-500 font-medium w-6">#{index + 1}</span>
                {getStepIcon(step)}
                <div className="text-sm">{getStepDescription(step)}</div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6">
          <Button onClick={onClose} className="w-full">Cerrar</Button>
        </div>
      </div>
    </Modal>
  )
}
