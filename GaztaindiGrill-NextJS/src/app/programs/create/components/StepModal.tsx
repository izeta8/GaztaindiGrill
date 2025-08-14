"use client"

import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import type { Dispatch, SetStateAction } from 'react'

export type StepType = 'temperature' | 'position' | 'rotation' | 'action' | ''

export type StepFormState = {
  type: StepType
  time: string
  temperature: string
  position: string
  rotation: string
  action: string
}

type Option = { value: string; label: string }

type StepModalProps = {
  isOpen: boolean
  onClose: () => void
  stepForm: StepFormState
  setStepForm: Dispatch<SetStateAction<StepFormState>>
  onSubmit: () => void
  editingStep: number | null
  actionOptions: Option[]
}

export function StepModal({
  isOpen,
  onClose,
  stepForm,
  setStepForm,
  onSubmit,
  editingStep,
  actionOptions
}: StepModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4" id="step-modal-title">
          {editingStep !== null ? 'Editar Paso' : 'Añadir Nuevo Paso'}
        </h3>

        <div className="space-y-4">
          <Select
            label="Tipo de Paso"
            value={stepForm.type}
            onChange={(value) => setStepForm(prev => ({ ...prev, type: value as StepType }))}
            options={[
              { value: 'temperature', label: 'Temperatura' },
              { value: 'position', label: 'Posición' },
              { value: 'rotation', label: 'Rotación' },
              { value: 'action', label: 'Acción' }
            ]}
            required
          />

          {stepForm.type === 'temperature' && (
            <>
              <Input
                label="Temperatura (°C)"
                type="number"
                value={stepForm.temperature}
                onChange={(value) => setStepForm(prev => ({ ...prev, temperature: value }))}
                placeholder="300"
                min={0}
                max={500}
                required
              />
              <Input
                label="Tiempo (segundos)"
                type="number"
                value={stepForm.time}
                onChange={(value) => setStepForm(prev => ({ ...prev, time: value }))}
                placeholder="60"
                min={1}
                required
              />
            </>
          )}

          {stepForm.type === 'position' && (
            <>
              <Input
                label="Posición"
                type="number"
                value={stepForm.position}
                onChange={(value) => {
                  const n = Number(value)
                  if (Number.isNaN(n)) {
                    setStepForm(prev => ({ ...prev, position: '' }))
                    return
                  }
                  const clamped = Math.max(0, Math.min(100, Math.floor(n)))
                  setStepForm(prev => ({ ...prev, position: String(clamped) }))
                }}
                placeholder="80"
                min={0}
                max={100}
                required
              />
              <Input
                label="Tiempo (segundos)"
                type="number"
                value={stepForm.time}
                onChange={(value) => setStepForm(prev => ({ ...prev, time: value }))}
                placeholder="30"
                min={1}
                required
              />
            </>
          )}

          {stepForm.type === 'rotation' && (
            <>
              <Input
                label="Rotación (°)"
                type="number"
                value={stepForm.rotation}
                onChange={(value) => {
                  const n = Number(value)
                  if (Number.isNaN(n)) {
                    setStepForm(prev => ({ ...prev, rotation: '' }))
                    return
                  }
                  const clamped = Math.max(0, Math.min(360, Math.floor(n)))
                  setStepForm(prev => ({ ...prev, rotation: String(clamped) }))
                }}
                placeholder="45"
                min={0}
                max={360}
                required
              />
              <Input
                label="Tiempo (segundos)"
                type="number"
                value={stepForm.time}
                onChange={(value) => setStepForm(prev => ({ ...prev, time: value }))}
                placeholder="30"
                min={1}
                required
              />
            </>
          )}

          {stepForm.type === 'action' && (
            <Select
              label="Acción"
              value={stepForm.action}
              onChange={(value) => setStepForm(prev => ({ ...prev, action: value }))}
              options={actionOptions}
              required
            />
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            onClick={onClose}
            variant="secondary"
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            onClick={onSubmit}
            className="flex-1"
            disabled={
              !stepForm.type ||
              (stepForm.type === 'temperature' && (!stepForm.temperature || !stepForm.time)) ||
              (stepForm.type === 'position' && (!stepForm.position || !stepForm.time)) ||
              (stepForm.type === 'action' && !stepForm.action)
            }
          >
            {editingStep !== null ? 'Actualizar' : 'Añadir'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
