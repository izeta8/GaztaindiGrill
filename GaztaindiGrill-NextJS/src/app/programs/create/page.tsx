"use client"

import { toast } from 'sonner'
import { ProgramForm, type ProgramFormSubmitPayload } from '@/app/programs/_components/ProgramForm'
export default function CreateProgram() {
  const onSubmit = async (payload: ProgramFormSubmitPayload) => {
    try {
      const body: Record<string, unknown> = {
        name: payload.name,
        description: payload.description,
        creatorName: payload.creatorName,
        stepsJson: payload.stepsJson,
      }
      if (payload.categoryId != null) body.categoryId = payload.categoryId

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/programs/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (response.ok) {
        toast.success('¡Programa creado correctamente!')
      } else {
        const errorData = await response.json().catch(() => ({}))
        toast.error('Error al crear el programa: ' + (errorData?.message || 'Error desconocido'))
      }
    } catch {
      toast.error('Error de conexión. Inténtalo de nuevo.')
    }
  }

  return (
    <ProgramForm
      mode="create"
      initialValues={{ name: '', description: '', creatorName: '', steps: [] }}
      onSubmit={onSubmit}
      submitLabel="Crear Programa"
    />
  )
}
