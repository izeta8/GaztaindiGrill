"use client"

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import GrillScene from '@/components/three/GrillScene'
import { useGrillState } from '@/app/control/hooks/useGrillState'
import { minSafePosition } from '@/utils/rotation'

// Same step as the old slider: a finger cannot land on an exact number.
const POSITION_STEP = 5

const snapPosition = (position: number) =>
  Math.min(100, Math.max(0, Math.round(position / POSITION_STEP) * POSITION_STEP))

type DragMode = 'height' | 'rotation'

interface GrillPositionModalProps {
  grillIndex: 0 | 1 | null
  isLocked: boolean
  onClose: () => void
  onMove: (grillIndex: 0 | 1, position: number, rotation?: number) => void
}

export function GrillPositionModal({ grillIndex, isLocked, onClose, onMove }: GrillPositionModalProps) {
  return (
    <Modal isOpen={grillIndex !== null} onClose={onClose}>
      {grillIndex !== null && (
        // Keyed so the target starts again from the real pose every time the modal opens.
        <GrillPositionView
          key={grillIndex}
          grillIndex={grillIndex}
          isLocked={isLocked}
          onClose={onClose}
          onMove={onMove}
        />
      )}
    </Modal>
  )
}

interface GrillPositionViewProps {
  grillIndex: 0 | 1
  isLocked: boolean
  onClose: () => void
  onMove: (grillIndex: 0 | 1, position: number, rotation?: number) => void
}

function GrillPositionView({ grillIndex, isLocked, onClose, onMove }: GrillPositionViewProps) {
  const grillState = useGrillState(grillIndex)
  // Only the left grill has a rotor, so only it can be tilted.
  const hasRotor = grillIndex === 0

  const [mode, setMode] = useState<DragMode>('height')
  // A grill left tilted below its floor opens with the target already raised out of the red band.
  const [target, setTarget] = useState(() =>
    Math.max(snapPosition(grillState.position), minSafePosition(grillState.rotation)))
  const [rotation, setRotation] = useState(() => grillState.rotation)
  // Kept apart from the targets so a half-typed or out-of-range value does not move the grill.
  const [positionDraft, setPositionDraft] = useState(() => String(target))
  const [rotationDraft, setRotationDraft] = useState(() => String(rotation))

  // A tilted rack hangs below its axis, so the grill refuses to stay under this height.
  const applyPosition = (position: number, degrees: number) => {
    const floor = Math.max(position, minSafePosition(degrees))
    setTarget(floor)
    setPositionDraft(String(floor))
  }

  const handleDragHeight = (position: number) => applyPosition(snapPosition(position), rotation)

  const handleDragRotation = (degrees: number) => {
    setRotation(degrees)
    setRotationDraft(String(degrees))
    // Turning into a steeper angle pushes the rack up out of the forbidden band.
    applyPosition(target, degrees)
  }

  const handlePositionDraft = (value: string) => {
    if (!/^\d{0,3}$/.test(value)) return
    setPositionDraft(value)
    const position = Number(value)
    if (value !== '' && position <= 100) setTarget(Math.max(position, minSafePosition(rotation)))
  }

  const handleRotationDraft = (value: string) => {
    if (!/^\d{0,3}$/.test(value)) return
    setRotationDraft(value)
    const degrees = Number(value)
    if (value === '' || degrees >= 360) return
    setRotation(degrees)
    applyPosition(target, degrees)
  }

  const handleMove = () => {
    onMove(grillIndex, target, hasRotor ? rotation : undefined)
    onClose()
  }

  return (
    <div className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-1">
        {hasRotor ? 'Parrilla izquierda' : 'Parrilla derecha'}
      </h3>
      <p className="text-sm text-gray-500 mb-4">
        Posición actual: {grillState.position}%{hasRotor && ` · ${grillState.rotation}°`}
      </p>

      {hasRotor && (
        <div className="flex gap-1 p-1 mb-3 bg-gray-100 rounded-xl">
          {([['height', 'Altura'], ['rotation', 'Giro']] as const).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setMode(value)}
              className={`flex-1 h-9 rounded-lg text-sm font-semibold transition-colors ${mode === value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      <div className="relative">
        <GrillScene
          className="w-full h-[320px] touch-none cursor-grab active:cursor-grabbing"
          controls={false}
          showLabels={false}
          focusGrill={grillIndex}
          target={{
            position: target,
            rotation,
            mode: hasRotor ? mode : 'height',
            onDragHeight: handleDragHeight,
            onDragRotation: handleDragRotation,
          }}
        />

        {/* Only the field for what the selector is moving, so there is one number to read. */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
          {mode === 'height' || !hasRotor ? (
            <ValueField
              label="Posición objetivo"
              value={positionDraft}
              unit="%"
              onChange={handlePositionDraft}
              onBlur={() => setPositionDraft(String(target))}
            />
          ) : (
            <ValueField
              label="Inclinación objetivo"
              value={rotationDraft}
              unit="°"
              onChange={handleRotationDraft}
              onBlur={() => setRotationDraft(String(rotation))}
            />
          )}
        </div>
      </div>

      <div className="flex gap-3 mt-6">
        <Button onClick={onClose} variant="secondary" className="flex-1">
          Cancelar
        </Button>
        <Button onClick={handleMove} className="flex-1" disabled={isLocked}>
          Mover
        </Button>
      </div>
    </div>
  )
}

interface ValueFieldProps {
  label: string
  value: string
  unit: string
  onChange: (value: string) => void
  onBlur: () => void
}

function ValueField({ label, value, unit, onChange, onBlur }: ValueFieldProps) {
  return (
    <label className="flex items-center gap-1 rounded-xl bg-white/90 border border-gray-200 shadow-sm px-3 h-10">
      <input
        type="text"
        inputMode="numeric"
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className="w-10 bg-transparent text-center text-base font-semibold text-gray-900 focus:outline-none"
      />
      <span className="text-sm font-semibold text-gray-500">{unit}</span>
    </label>
  )
}
