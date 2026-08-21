"use client"

import { Clock, Edit2, Trash2, ArrowUp } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type { ProgramStep } from '@/types'
import { getStepDescription, getStepIcon } from '@/utils'

export type StepsListProps = {
  steps: ProgramStep[]
  onMove: (index: number, direction: 'up' | 'down') => void
  onEdit: (index: number) => void
  onDelete: (index: number) => void
}

export function StepsList({ steps, onMove, onEdit, onDelete }: StepsListProps) {
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
            <span className="max-[360px]:hidden">{getStepIcon(step)}</span>
            <span className="text-sm font-medium">
              {getStepDescription(step)}
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