"use client"

import { Modal } from "@/components/ui/Modal"
import { Button } from "@/components/ui/Button"
import type { Program } from "@/lib/types"

interface Props {
  isOpen: boolean
  onClose: () => void
  onSelect: (side: 0 | 1) => void
  program: Program | null
  loading?: boolean
}

export function SelectGrillModal({ isOpen, onClose, onSelect, program, loading = false }: Props) {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Seleccionar parrilla</h3>
        <p className="text-sm text-gray-700 mb-4">
          {program ? (
            <>¿En qué parrilla quieres ejecutar &quot;{program.name}&quot;?</>
          ) : (
            '¿En qué parrilla quieres ejecutar el programa?'
          )}
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Button onClick={() => onSelect(0)} className="w-full" disabled={loading}>
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <span className="h-4 w-4 rounded-full border-2 border-white/70 border-t-transparent animate-spin" />
                Conectando...
              </span>
            ) : (
              'Izquierda'
            )}
          </Button>
          <Button onClick={() => onSelect(1)} className="w-full" disabled={loading}>
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <span className="h-4 w-4 rounded-full border-2 border-white/70 border-t-transparent animate-spin" />
                Conectando...
              </span>
            ) : (
              'Derecha'
            )}
          </Button>
        </div>
        <div className="flex gap-3 mt-6">
          <Button onClick={onClose} variant="secondary" className="flex-1" disabled={loading}>Cancelar</Button>
        </div>
      </div>
    </Modal>
  )
}
