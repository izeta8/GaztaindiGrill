"use client"

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { List, Clock } from 'lucide-react'
import { useMqtt } from '@/hooks/useMqtt'

import { ProgramCard } from './components/ProgramCard'
import { StepsModal } from './components/StepsModal'
import { ConfirmExecuteModal } from './components/ConfirmExecuteModal'
import { SelectGrillModal } from './components/SelectGrillModal'
import { ProcessingModal } from './components/ProcessingModal'
import { FiltersBar } from './components/FiltersBar'
import { parseSteps } from '@/utils'
import type { Program } from '@/types'
import { TOPICS } from '@/constants/mqtt'
import { PageHeader } from '@/components/shared/PageHeader'
import { GlobalStatusDock } from '@/components/shared/GlobalStatusDock'

type Category = { id: number; name: string }

type ApiCategory = { id: number; name: string }

type ApiProgram = Record<string, unknown> & {
  id: number; name: string; steps_json: string;
  usage_count: number; creator_name: string; creation_date: string; update_date: string; is_active: number;
  category_id?: number | null;
  description?: string | null;
}

function ProgramsPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { publish } = useMqtt()

  const [programs, setPrograms] = useState<Program[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Steps modal
  const [isStepsModalOpen, setIsStepsModalOpen] = useState(false)
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null)

  // Execute confirmation modal
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [programToExecute, setProgramToExecute] = useState<Program | null>(null)
  // Select grill modal
  const [isSelectOpen, setIsSelectOpen] = useState(false)
  const [isExecuting, setIsExecuting] = useState(false)

  // Categories
  const [categories, setCategories] = useState<Category[]>([])

  // Filters
  const [searchId, setSearchId] = useState('')
  const [searchName, setSearchName] = useState('')
  const [searchCreator, setSearchCreator] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<'all' | number>('all')
  const [initializedFromUrl, setInitializedFromUrl] = useState(false)

  // Initialize filters from URL query params once
  useEffect(() => {
    if (initializedFromUrl) return
    try {
      const id = searchParams.get('id') || ''
      const name = searchParams.get('name') || ''
      const creator = searchParams.get('creator') || ''
      const categoryStr = searchParams.get('category') || ''
      const category: 'all' | number = categoryStr && !Number.isNaN(Number(categoryStr))
        ? Number(categoryStr)
        : 'all'

      if (id) setSearchId(id)
      if (name) setSearchName(name)
      if (creator) setSearchCreator(creator)
      setSelectedCategory(category)
    } finally {
      setInitializedFromUrl(true)
    }
  }, [searchParams, initializedFromUrl])

  // Reflect filters to URL query params
  useEffect(() => {
    if (!initializedFromUrl) return
    const params = new URLSearchParams()
    if (searchId.trim()) params.set('id', searchId.trim())
    if (searchName.trim()) params.set('name', searchName.trim())
    if (searchCreator.trim()) params.set('creator', searchCreator.trim())
    if (selectedCategory !== 'all') params.set('category', String(selectedCategory))

    const qs = params.toString()
    const path = typeof window !== 'undefined' ? window.location.pathname : '/programs/list'
    router.replace(qs ? `${path}?${qs}` : path)
  }, [searchId, searchName, searchCreator, selectedCategory, initializedFromUrl, router])

  const handleClearFilters = () => {
    setSearchId('')
    setSearchName('')
    setSearchCreator('')
    setSelectedCategory('all')
    const path = typeof window !== 'undefined' ? window.location.pathname : '/programs/list'
    router.replace(path)
  }

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
          .filter((p): p is ApiProgram =>
            typeof p.id === 'number' &&
            typeof p.name === 'string' &&
            typeof p.steps_json === 'string' &&
            typeof p.usage_count === 'number' &&
            typeof p.creator_name === 'string' &&
            typeof p.creation_date === 'string' &&
            typeof p.update_date === 'string' &&
            typeof p.is_active === 'number'
          )
          .map((p) => ({
            id: p.id,
            name: p.name,
            description: typeof p.description === 'string' ? p.description : undefined,
            categoryId: typeof p.category_id === 'number' ? p.category_id : undefined,
            stepsJson: p.steps_json,
            usageCount: p.usage_count,
            creatorName: p.creator_name,
            creationDate: p.creation_date,
            updateDate: p.update_date,
            isActive: p.is_active === 1,
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
    // After confirming, ask which grill to use
    if (!programToExecute) return
    setIsConfirmOpen(false)
    setIsSelectOpen(true)
  }

  const handleSelectGrill = async (side: 0 | 1) => {
    try {
      setIsExecuting(true)
      if (!programToExecute) return

      const stepsJSON = JSON.parse(programToExecute.stepsJson);
      const programToRun = {
        programId: programToExecute.id,
        steps: stepsJSON || '[]',
        name: programToExecute.name,
        creatorName: programToExecute.creatorName,
        description: programToExecute.description,
        usageCount: programToExecute.usageCount
      }

      const topic = `grill/${side}/${TOPICS.ACTION.PROGRAM.EXECUTE}`
      await publish(topic, JSON.stringify(programToRun), { qos: 1 })

      toast.success(`Ejecución iniciada en parrilla ${side === 0 ? 'izquierda' : 'derecha'} para "${programToExecute.name}"`)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error desconocido ejecutando programa'
      toast.error(msg)
    } finally {
      setIsSelectOpen(false)
      setProgramToExecute(null)
      setIsExecuting(false)
    }
  }

  const handleEdit = (program: Program) => {
    router.push(`/programs/edit?id=${program.id}`)
  }

  const getCategoryName = (categoryId?: number) => {
    if (!categoryId) return 'Sin categoría'
    return categories.find(c => c.id === categoryId)?.name || `Categoría #${categoryId}`
  }

  const filteredPrograms = programs
    .filter((p) => p.isActive)
    .filter((p) => {
      const idOk = !searchId.trim() || String(p.id) === searchId.trim()
      const nameOk = !searchName.trim() || p.name.toLowerCase().includes(searchName.toLowerCase())
      const creatorOk = !searchCreator.trim() || (p.creatorName || '').toLowerCase().includes(searchCreator.toLowerCase())
      const categoryOk = selectedCategory === 'all' || p.categoryId === selectedCategory
      return idOk && nameOk && creatorOk && categoryOk
    })

  return (
    <div className="min-h-screen bg-gray-50 py-4 px-4">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <PageHeader
          pageTitle='Programas'
          pageDescription='Lista de programas disponibles'
        />

        <GlobalStatusDock />

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
          ) : (
            <div className="space-y-4">

              {/* Filtros */}
              <FiltersBar
                categories={categories}
                searchId={searchId}
                onSearchIdChange={setSearchId}
                searchName={searchName}
                onSearchNameChange={setSearchName}
                searchCreator={searchCreator}
                onSearchCreatorChange={setSearchCreator}
                selectedCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
                onClearFilters={handleClearFilters}
              />

              {/* Lista filtrada */}
              {filteredPrograms.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <List className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  No hay programas que coincidan con el filtro
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredPrograms.map((p) => {
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

        <SelectGrillModal
          isOpen={isSelectOpen}
          onClose={() => (isExecuting ? null : setIsSelectOpen(false))}
          onSelect={handleSelectGrill}
          program={programToExecute}
        />

        <ProcessingModal
          isOpen={isExecuting}
          title="Procesando..."
          message="Conectando al broker y publicando el programa. Por favor, espera."
        />
      </div>
    </div>
  )
}

export default function ProgramsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Cargando programas...</p>
      </div>
    </div>}>
      <ProgramsPageContent />
    </Suspense>
  )
}
