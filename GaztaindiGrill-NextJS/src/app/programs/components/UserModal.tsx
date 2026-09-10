"use client"

import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

type UserModalProps = {
  isOpen: boolean
  onClose: () => void
  newUserName: string
  setNewUserName: (v: string) => void
  onCreate: () => void
  isCreating: boolean
}

export function UserModal({
  isOpen,
  onClose,
  newUserName,
  setNewUserName,
  onCreate,
  isCreating
}: UserModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={() => !isCreating && onClose()}>
      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Crear Usuario</h3>
        <div className="space-y-4">
          <Input
            label="Nombre del usuario"
            value={newUserName}
            onChange={setNewUserName}
            placeholder="Ej: Julen"
            required
          />
        </div>
        <div className="flex gap-3 mt-6">
          <Button
            onClick={onClose}
            variant="secondary"
            className="flex-1"
            disabled={isCreating}
          >
            Cancelar
          </Button>
          <Button
            onClick={onCreate}
            className="flex-1"
            disabled={isCreating || !newUserName.trim()}
          >
            {isCreating ? 'Creando...' : 'Crear'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
