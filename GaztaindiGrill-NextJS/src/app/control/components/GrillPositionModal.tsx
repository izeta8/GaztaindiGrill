"use client"

import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import GrillScene from '@/components/three/GrillScene'
import { useGrillState } from '@/app/control/hooks/useGrillState'

interface GrillPositionModalProps {
  grillIndex: 0 | 1 | null
  onClose: () => void
}

export function GrillPositionModal({ grillIndex, onClose }: GrillPositionModalProps) {
  const grillState = useGrillState(grillIndex ?? 0)

  return (
    <Modal isOpen={grillIndex !== null} onClose={onClose}>
      {grillIndex !== null && (
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {grillIndex === 0 ? 'Parrilla izquierda' : 'Parrilla derecha'}
          </h3>
          <p className="text-sm text-gray-500 mb-4">Posición actual: {grillState.position}%</p>

          <GrillScene
            className="w-full h-[320px] touch-none"
            controls={false}
            showLabels={false}
            focusGrill={grillIndex}
          />

          <div className="flex gap-3 mt-6">
            <Button onClick={onClose} variant="secondary" className="flex-1">
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
