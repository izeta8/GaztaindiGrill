"use client"

import { Clock, Thermometer, Target, ArrowUp, MoveVertical, RotateCw, Edit2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type { ProgramStep } from '@/lib/types'
import type { ReactNode } from 'react'

export type StepsListProps = {
  steps: ProgramStep[]
  onMove: (index: number, direction: 'up' | 'down') => void
  onEdit: (index: number) => void
  onDelete: (index: number) => void
  actionOptions: { value: string; label: string }[]
}

function getStepIcon(step: ProgramStep) {
  if (step.action) return <Target className="h-5 w-5" />
  if (step.temperature) return <Thermometer className="h-7 w-7" />
  if (step.position) return <MoveVertical className="h-5 w-5" />
  if (step.rotation) return <RotateCw className="h-5 w-5" />
  return <Clock className="h-5 w-5" />
}

function formatSeconds(seconds: number) {
  if (seconds > 60) {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}m ${s}s`
  }
  return `${seconds}s`
}

function getStepDescription(step: ProgramStep, actionOptions: { value: string; label: string }[]): ReactNode {
  if (step.action) {
    const actionLabel = actionOptions.find(opt => opt.value === step.action)?.label || step.action
    return (
      <div className="leading-tight">
        <div><span className="font-medium">Acción:</span> {actionLabel}</div>
      </div>
    )
  }
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

export function StepsList({ steps, onMove, onEdit, onDelete, actionOptions }: StepsListProps) {
  if (steps.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Clock className="h-12 w-12 mx-auto mb-3 text-gray-300" />
        <p>No hay pasos añadidos</p>
        <p className="text-sm">Haz clic en &quot;Añadir Paso&quot; para comenzar</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {steps.map((step, index) => (
        <div
          key={index}
          className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg bg-gray-50"
        >
          <div className="flex items-center gap-2 text-gray-600">
            <span className="font-medium text-sm">#{index + 1}</span>
          </div>

          <div className="flex items-center gap-2 flex-1">
            {getStepIcon(step)}
            <span className="text-sm font-medium">
              {getStepDescription(step, actionOptions)}
            </span>
          </div>

          <div className="grid grid-cols-2 items-center gap-1">
            <Button
              onClick={() => onMove(index, 'up')}
              variant="secondary"
              size="sm"
              disabled={index === 0}
              className="p-2"
              ariaLabel={`Mover paso ${index + 1} arriba`}
            >
              <ArrowUp className="h-3 w-3" />
            </Button>

            <Button
              onClick={() => onMove(index, 'down')}
              variant="secondary"
              size="sm"
              disabled={index === steps.length - 1}
              className="p-2 rotate-180"
              ariaLabel={`Mover paso ${index + 1} abajo`}
            >
              <ArrowUp className="h-3 w-3" />
            </Button>

            <Button
              onClick={() => onEdit(index)}
              variant="secondary"
              size="sm"
              className="p-2"
              ariaLabel={`Editar paso ${index + 1}`}
            >
              <Edit2 className="h-3 w-3" />
            </Button>

            <Button
              onClick={() => onDelete(index)}
              variant="danger"
              size="sm"
              className="p-2"
              ariaLabel={`Eliminar paso ${index + 1}`}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
