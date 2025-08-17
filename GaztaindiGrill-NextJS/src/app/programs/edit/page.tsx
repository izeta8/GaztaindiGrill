"use client"

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { ProgramForm, type ProgramFormInitialValues, type ProgramFormSubmitPayload } from '@/app/programs/_components/ProgramForm'
import { parseSteps } from '@/lib/utils'
import { Button } from '@/components/ui/Button'

function Status({
  type,
  title,
  description,
}: {
  type: 'loading' | 'error' | 'info'
  title: string
  description?: string
}) {
  const router = useRouter()
  const color = type === 'error' ? 'text-red-700 border-red-200 bg-red-50' : 'text-slate-700 border-slate-200 bg-slate-50'
  return (
    <div className="flex min-h-[40vh] items-center justify-center p-6">
      <div className={`w-full max-w-xl rounded-lg border ${color} p-5 shadow-sm`}>        
        <div className="flex items-start gap-3">
          {type === 'loading' ? (
            <svg className="mt-1 h-5 w-5 animate-spin text-slate-500" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          ) : (
            <svg className={`mt-1 h-5 w-5 ${type === 'error' ? 'text-red-600' : 'text-slate-600'}`} viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-1-5a1 1 0 112 0 1 1 0 01-2 0zm1-8a1 1 0 00-1 1v5a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          )}
          <div className="flex flex-1 flex-col">
            <h2 className="text-base font-semibold leading-6">{title}</h2>
            {description ? <p className="mt-1 text-sm opacity-90">{description}</p> : null}
            <div className="mt-3">
              <Button
                onClick={() => router.push('/programs/list')}
                variant={type === 'loading' ? 'secondary' : 'primary'}
              >
                Volver a la lista
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function EditProgramPage() {
  const searchParams = useSearchParams()
  const id = searchParams.get('id') ?? undefined
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
          usageCount: data?.usage_count,
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
    return (
      <Status
        type="error"
        title="Configuración faltante"
        description="No se ha definido NEXT_PUBLIC_API_URL. Añádelo al archivo .env.local y reinicia la app."
      />
    )
  }

  if (!id) {
    return (
      <Status
        type="error"
        title="Falta el parámetro id"
        description="Añade ?id=... a la URL para editar un programa específico."
      />
    )
  }

  if (loading) {
    return (
      <Status
        type="loading"
        title="Cargando programa"
        description="Por favor, espera mientras obtenemos los datos."
      />
    )
  }

  if (!initial) {
    return (
      <Status
        type="error"
        title="Programa no encontrado"
        description="No se encontraron datos del programa solicitado."
      />
    )
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
