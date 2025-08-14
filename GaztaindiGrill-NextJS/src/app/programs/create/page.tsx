"use client"

import { toast } from 'sonner'
import { ProgramForm, type ProgramFormSubmitPayload } from '@/app/programs/_components/ProgramForm'
import { useRouter } from 'next/navigation'
export default function CreateProgram() {
  const router = useRouter()
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
        type CreateResp = { id?: number | string; programId?: number | string; data?: { id?: number | string } }
        let newId: number | string | undefined = undefined
        try {
          const data: Partial<CreateResp> = await response.json()
          newId = data.id ?? data.programId ?? data.data?.id
        } catch {}
        toast.success('¡Programa creado correctamente!')
        if (newId != null) {
          router.push(`/programs/list?id=${String(newId)}`)
        } else {
          router.push('/programs/list')
        }
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
