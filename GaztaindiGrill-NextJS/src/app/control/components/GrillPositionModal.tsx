"use client"

import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import GrillScene from '@/components/three/GrillScene'
import { useGrillState } from '@/app/control/hooks/useGrillState'

// Same step as the old slider: a finger cannot land on an exact number.
const POSITION_STEP = 5

const snapPosition = (position: number) =>
  Math.min(100, Math.max(0, Math.round(position / POSITION_STEP) * POSITION_STEP))

interface GrillPositionModalProps {
  grillIndex: 0 | 1 | null
  isLocked: boolean
  onClose: () => void
  onMove: (grillIndex: 0 | 1, position: number) => void
}

export function GrillPositionModal({ grillIndex, isLocked, onClose, onMove }: GrillPositionModalProps) {
  return (
    <Modal isOpen={grillIndex !== null} onClose={onClose}>
      {grillIndex !== null && (
        // Keyed so the ghost starts again from the real height every time the modal opens.
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
  onMove: (grillIndex: 0 | 1, position: number) => void
}

function GrillPositionView({ grillIndex, isLocked, onClose, onMove }: GrillPositionViewProps) {
  const grillState = useGrillState(grillIndex)
  const [target, setTarget] = useState(() => snapPosition(grillState.position))

  const handleMove = () => {
    onMove(grillIndex, target)
    onClose()
  }

  return (
    <div className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-1">
        {grillIndex === 0 ? 'Parrilla izquierda' : 'Parrilla derecha'}
      </h3>
      <p className="text-sm text-gray-500 mb-4">
        Posición actual: {grillState.position}%. Arrastra la parrilla naranja arriba o abajo.
      </p>

      <GrillScene
        className="w-full h-[320px] touch-none cursor-grab active:cursor-grabbing"
        controls={false}
        showLabels={false}
        focusGrill={grillIndex}
        ghost={{ position: target, onDrag: (position) => setTarget(snapPosition(position)) }}
      />

      <div className="flex gap-3 mt-6">
        <Button onClick={onClose} variant="secondary" className="flex-1">
          Cancelar
        </Button>
        <Button onClick={handleMove} className="flex-1" disabled={isLocked}>
          Mover a {target}%
        </Button>
      </div>
    </div>
  )
}
