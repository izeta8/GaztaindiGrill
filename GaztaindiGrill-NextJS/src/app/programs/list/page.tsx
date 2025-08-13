"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { List, Clock } from 'lucide-react'

import { ProgramCard } from './components/ProgramCard'
import { StepsModal } from './components/StepsModal'
import { ConfirmExecuteModal } from './components/ConfirmExecuteModal'
import { parseSteps } from '@/lib/utils'
import type { Program } from '@/lib/types'

type Category = { id: number; name: string }
type ApiCategory = { id: number; name: string } | { categoryId: number; name: string } | Record<string, unknown>

export default function ProgramsPage() {
  const router = useRouter()

  const [programs, setPrograms] = useState<Program[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Steps modal
  const [isStepsModalOpen, setIsStepsModalOpen] = useState(false)
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null)

  // Execute confirmation modal
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [programToExecute, setProgramToExecute] = useState<Program | null>(null)
  
  // Categories
  const [categories, setCategories] = useState<Category[]>([])

  useEffect(() => {
    const loadPrograms = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/programs`)
        if (!res.ok) throw new Error('No se pudieron cargar los programas')
        const data: unknown = await res.json()
        const arr = Array.isArray(data) ? (data as Record<string, unknown>[]) : []

        const mapped: Program[] = arr
          .filter((p): p is Record<string, unknown> & {
            id: number; name: string; category_id: number; steps_json: string;
            usage_count: number; creator_name: string; creation_date: string; update_date: string; is_active: boolean | number;
          } =>
            typeof p.id === 'number' &&
            typeof p.name === 'string' &&
            typeof p.category_id === 'number' &&
            typeof p.steps_json === 'string' &&
            typeof p.usage_count === 'number' &&
            typeof p.creator_name === 'string' &&
            typeof p.creation_date === 'string' &&
            typeof p.update_date === 'string' &&
            (typeof p.is_active === 'boolean' || typeof p.is_active === 'number')
          )
          .map((p) => ({
            id: p.id,
            name: p.name,
            description: typeof p.description === 'string' ? p.description : undefined,
            categoryId: p.category_id,
            stepsJson: p.steps_json,
            usageCount: p.usage_count,
            creatorName: p.creator_name,
            creationDate: p.creation_date,
            updateDate: p.update_date,
            isActive: typeof p.is_active === 'boolean' ? p.is_active : p.is_active === 1,
          }))
        setPrograms(mapped)
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Error desconocido al cargar programas'
        setError(msg)
        toast.error(msg)
      } finally {
        setLoading(false)
      }
    }
    loadPrograms()
  }, [])

  // Load categories for mapping categoryId -> name
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/categories`)
        if (!res.ok) return
        const data = await res.json()
        const arr: ApiCategory[] = Array.isArray(data) ? data : (data?.results || data?.data || [])
        const mapped: Category[] = (Array.isArray(arr) ? arr : []).map((c) => {
          if (typeof c === 'object' && c !== null) {
            const maybe = c as Record<string, unknown>
            const id = (maybe.id as number) ?? (maybe.categoryId as number)
            const name = (maybe.name as string) ?? ''
            if (typeof id === 'number' && name) return { id, name }
          }
          return { id: -1, name: 'Desconocida' }
        })
        setCategories(mapped)
      } catch {
        // silent, categories are optional for display
      }
    }
    loadCategories()
  }, [])

  const selectedSteps = parseSteps(selectedProgram?.stepsJson || '[]')

  const openStepsModal = (program: Program) => {
    setSelectedProgram(program)
    setIsStepsModalOpen(true)
  }

  const handleExecuteClick = (program: Program) => {
    setProgramToExecute(program)
    setIsConfirmOpen(true)
  }

  const confirmExecute = () => {
    if (!programToExecute) return
    // Simulated execution: show toast (same pattern used in create page)
    toast.success(`Ejecución iniciada para "${programToExecute.name}" (simulado)`) 
    setIsConfirmOpen(false)
    setProgramToExecute(null)
  }

  const handleEdit = (program: Program) => {
    router.push(`/programs/${program.id}/edit`)
  }

  const getCategoryName = (categoryId?: number) => {
    if (!categoryId) return 'Sin categoría'
    return categories.find(c => c.id === categoryId)?.name || `Categoría #${categoryId}`
  }

  return (
    <div className="min-h-screen bg-gray-50 py-4 px-4">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
            Programas
          </h1>
          <p className="text-sm text-gray-600 text-center">Lista de programas disponibles</p>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          {loading ? (
            <div className="text-center py-10 text-gray-500">
              <Clock className="h-10 w-10 mx-auto mb-3 text-gray-300" />
              Cargando programas...
            </div>
          ) : error ? (
            <div className="text-center py-10 text-red-500">
              {error}
            </div>
          ) : programs.length === 0 ? (
            <div className="text-center py-10 text-gray-500">
              <List className="h-10 w-10 mx-auto mb-3 text-gray-300" />
              No hay programas creados
            </div>
          ) : (
            <div className="space-y-3">
              {programs.map((p) => {

                if (!p.isActive) return null

                const steps = parseSteps(p.stepsJson)
                return (
                  <ProgramCard
                    key={p.id}
                    program={p}
                    categoryName={getCategoryName(p.categoryId)}
                    stepsCount={steps.length}
                    onViewSteps={openStepsModal}
                    onExecute={handleExecuteClick}
                    onEdit={handleEdit}
                  />
                )
              })}
            </div>
          )}
        </div>

        <StepsModal
          isOpen={isStepsModalOpen}
          onClose={() => setIsStepsModalOpen(false)}
          program={selectedProgram}
          steps={selectedSteps}
        />

        <ConfirmExecuteModal
          isOpen={isConfirmOpen}
          onClose={() => setIsConfirmOpen(false)}
          onConfirm={confirmExecute}
          program={programToExecute}
        />
      </div>
    </div>
  )
}
