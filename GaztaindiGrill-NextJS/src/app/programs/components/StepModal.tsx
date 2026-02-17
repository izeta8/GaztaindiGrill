"use client"

import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import type { Dispatch, SetStateAction } from 'react'

export type StepType = 'temperature' | 'position' | 'rotation' | ''

export type StepFormState = {
  type: StepType
  time: string
  temperature: string
  position: string
  rotation: string
}

type StepModalProps = {
  isOpen: boolean
  onClose: () => void
  stepForm: StepFormState
  setStepForm: Dispatch<SetStateAction<StepFormState>>
  onSubmit: () => void
  editingStep: number | null
}

export function StepModal({
  isOpen,
  onClose,
  stepForm,
  setStepForm,
  onSubmit,
  editingStep
}: StepModalProps) {
  
  const totalSeconds = Number(stepForm.time)
  const hasTime = !Number.isNaN(totalSeconds) && stepForm.time !== ''
  const minutesStr = hasTime ? String(Math.floor(totalSeconds / 60)) : ''
  const secondsStr = hasTime ? String(totalSeconds % 60) : ''

  const onMinutesChange = (value: string) => {
    const minutes = value === '' ? 0 : Math.max(0, Math.floor(Number(value)))
    const currentSeconds = hasTime ? (totalSeconds % 60) : 0
    const newTotal = minutes * 60 + currentSeconds
    setStepForm(prev => ({ ...prev, time: String(newTotal) }))
  }

  const onSecondsChange = (value: string) => {
    let secs = value === '' ? 0 : Math.floor(Number(value))
    if (Number.isNaN(secs)) secs = 0
    secs = Math.max(0, Math.min(59, secs))
    const currentMinutes = hasTime ? Math.floor(totalSeconds / 60) : 0
    const newTotal = currentMinutes * 60 + secs
    setStepForm(prev => ({ ...prev, time: String(newTotal) }))
  }
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
              { value: 'rotation', label: 'Rotación' }
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
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Minutos"
                  type="number"
                  value={minutesStr}
                  onChange={onMinutesChange}
                  placeholder="1"
                  min={0}
                  required
                />
                <Input
                  label="Segundos"
                  type="number"
                  value={secondsStr}
                  onChange={onSecondsChange}
                  placeholder="0"
                  min={0}
                  max={59}
                  required
                />
              </div>
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
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Minutos"
                  type="number"
                  value={minutesStr}
                  onChange={onMinutesChange}
                  placeholder="0"
                  min={0}
                  required
                />
                <Input
                  label="Segundos"
                  type="number"
                  value={secondsStr}
                  onChange={onSecondsChange}
                  placeholder="30"
                  min={0}
                  max={59}
                  required
                />
              </div>
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
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Minutos"
                  type="number"
                  value={minutesStr}
                  onChange={onMinutesChange}
                  placeholder="0"
                  min={0}
                  required
                />
                <Input
                  label="Segundos"
                  type="number"
                  value={secondsStr}
                  onChange={onSecondsChange}
                  placeholder="30"
                  min={0}
                  max={59}
                  required
                />
              </div>
            </>
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
              (stepForm.type === 'rotation' && (!stepForm.rotation || !stepForm.time))
            }
          >
            {editingStep !== null ? 'Actualizar' : 'Añadir'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}