"use client"

import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

type CategoryModalProps = {
  isOpen: boolean
  onClose: () => void
  newCategoryName: string
  setNewCategoryName: (v: string) => void
  onCreate: () => void
  isCreating: boolean
}

export function CategoryModal({
  isOpen,
  onClose,
  newCategoryName,
  setNewCategoryName,
  onCreate,
  isCreating
}: CategoryModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={() => !isCreating && onClose()}>
      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Crear Categoría</h3>
        <div className="space-y-4">
          <Input
            label="Nombre de la categoría"
            value={newCategoryName}
            onChange={setNewCategoryName}
            placeholder="Ej: Carne"
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
            disabled={isCreating || !newCategoryName.trim()}
          >
            {isCreating ? 'Creando...' : 'Crear'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
