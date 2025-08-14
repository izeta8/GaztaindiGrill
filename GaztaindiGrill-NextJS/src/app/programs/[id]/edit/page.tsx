"use client"

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ProgramForm, type ProgramFormInitialValues, type ProgramFormSubmitPayload } from '@/app/programs/_components/ProgramForm'
import { parseSteps } from '@/lib/utils'

export default function EditProgramPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [initial, setInitial] = useState<ProgramFormInitialValues | null>(null)

  const apiBase = process.env.NEXT_PUBLIC_API_URL

  useEffect(() => {
    if (!id || !apiBase) return
    const load = async () => {
      setLoading(true)
      try {
        const res = await fetch(`${apiBase}/programs/${id}`)
        if (!res.ok) {
          toast.error('No se pudo cargar el programa')
          setLoading(false)
          return
        }
        const data = await res.json()

        const steps = parseSteps(data?.steps_json)
        const categoryId = data?.category_id
        
        const initialValues: ProgramFormInitialValues = {
          id,
          name: data?.name ?? '',
          description: data?.description ?? '',
          creatorName: data?.creatorName ?? data?.creator_name ?? '',
          categoryId: typeof categoryId === 'number' ? categoryId : null,
          steps,
          creationDate: data?.creation_date,
          updateDate: data?.update_date,
          usageCount: data?.usage_count
        }
        setInitial(initialValues)
      } catch {
        toast.error('Error de conexión al cargar el programa')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, apiBase])

  const onSubmit = useMemo(
    () => async (payload: ProgramFormSubmitPayload) => {
      if (!apiBase || !id) return
      try {
        const body: Record<string, unknown> = {
          name: payload.name,
          description: payload.description,
          creatorName: payload.creatorName,
          categoryId: payload.categoryId ?? null,
          stepsJson: payload.stepsJson,
          creationDate: payload.creationDate,
          updateDate: payload.updateDate,
          usageCount: payload.usageCount,
        }
        const res = await fetch(`${apiBase}/programs/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          toast.error(err?.message || 'No se pudo actualizar el programa')
          return
        }
        toast.success('Programa actualizado correctamente')
        router.push(`/programs/list?id=${encodeURIComponent(String(id))}`)
      } catch {
        toast.error('Error de conexión al actualizar el programa')
      }
    },
    [apiBase, id, router]
  )

  if (!apiBase) {
    return <div className="p-6 text-red-600">Falta NEXT_PUBLIC_API_URL</div>
  }

  if (loading) {
    return <div className="p-6">Cargando programa...</div>
  }

  if (!initial) {
    return <div className="p-6 text-red-600">No se encontraron datos del programa</div>
  }

  return (
    <ProgramForm
      mode="edit"
      initialValues={initial}
      onSubmit={onSubmit}
      submitLabel="Guardar cambios"
    />
  )
}
