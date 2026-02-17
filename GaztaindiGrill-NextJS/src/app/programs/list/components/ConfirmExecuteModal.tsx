"use client"

import { Modal } from "@/components/ui/Modal"
import { Button } from "@/components/ui/Button"
import type { Program } from "../../../../../types"

interface Props {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  program: Program | null
}

export function ConfirmExecuteModal({ isOpen, onClose, onConfirm, program }: Props) {
  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirmar ejecución</h3>
        <p className="text-sm text-gray-700">
          {program ? (
            <>¿Quieres ejecutar el programa &quot;{program.name}&quot;?</>
          ) : (
            '¿Quieres ejecutar este programa?'
          )}
        </p>
        <div className="flex gap-3 mt-6">
          <Button onClick={onClose} variant="secondary" className="flex-1">Cancelar</Button>
          <Button onClick={onConfirm} className="flex-1">Confirmar</Button>
        </div>
      </div>
    </Modal>
  )
}
