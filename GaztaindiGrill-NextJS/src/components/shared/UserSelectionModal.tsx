"use client"

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useCurrentUser } from '@/contexts/CurrentUserContext'

export function UserSelectionModal() {
  const {
    currentUser,
    users,
    isUserModalOpen,
    setCurrentUser,
    createUser,
    closeUserModal,
  } = useCurrentUser()

  const [selectedId, setSelectedId] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [newUserName, setNewUserName] = useState('')
  const [showCreateField, setShowCreateField] = useState(false)

  // On first entry there is no user yet, and nothing in the app works without one.
  const dismissible = currentUser !== undefined

  const handleConfirm = () => {
    const user = users.find((u) => String(u.id) === selectedId)
    if (user) setCurrentUser(user)
  }

  const handleCreate = async () => {
    setIsCreating(true)
    try {
      const created = await createUser(newUserName.trim())
      if (created) {
        setSelectedId(String(created.id))
        setNewUserName('')
        setShowCreateField(false)
      }
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Modal
      isOpen={isUserModalOpen}
      onClose={closeUserModal}
      dismissible={dismissible}
    >
      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">¿Quién eres?</h3>
        <p className="text-sm text-gray-500 mb-4">
          Se recordará en este navegador para no volver a preguntártelo.
        </p>

        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Select
              label="Usuario"
              value={selectedId}
              onChange={setSelectedId}
              options={users.map((u) => ({ value: String(u.id), label: u.name }))}
              required
            />
          </div>
          <Button
            onClick={() => setShowCreateField(!showCreateField)}
            variant="secondary"
            ariaLabel="Crear usuario"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {showCreateField && (
          <div className="mt-4 flex items-end gap-2">
            <div className="flex-1">
              <Input
                label="Nombre del nuevo usuario"
                value={newUserName}
                onChange={setNewUserName}
                placeholder="Ej: Julen"
                required
              />
            </div>
            <Button
              onClick={handleCreate}
              disabled={isCreating || !newUserName.trim()}
            >
              {isCreating ? 'Creando...' : 'Crear'}
            </Button>
          </div>
        )}

        <div className="flex gap-3 mt-6">
          {dismissible && (
            <Button onClick={closeUserModal} variant="secondary" className="flex-1">
              Cancelar
            </Button>
          )}
          <Button onClick={handleConfirm} className="flex-1" disabled={!selectedId}>
            Continuar
          </Button>
        </div>
      </div>
    </Modal>
  )
}
