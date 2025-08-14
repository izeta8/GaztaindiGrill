"use client"

import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { ProgramStep } from '@/lib/types'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Select } from '@/components/ui/Select'
import { toast } from 'sonner'
import { StepsList } from './components/StepsList'
import { StepModal, type StepFormState } from './components/StepModal'
import { CategoryModal } from './components/CategoryModal'

type Category = {
  id: number
  name: string
}

export default function CreateProgram() {

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    creatorName: ''
  })

  // Load categories on mount
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/categories`)
        if (!res.ok) {
          throw new Error('No se pudieron cargar las categorías')
        }
        const data = await res.json()
        if (Array.isArray(data)) {
          setCategories(data as Category[])
        } else {
          // In case API wraps results
          const arr = (data?.results || data?.data || []) as Category[]
          setCategories(Array.isArray(arr) ? arr : [])
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Error al cargar categorías'
        toast.error(message)
      }
    }
    loadCategories()
  }, [])
  
  const [steps, setSteps] = useState<ProgramStep[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingStep, setEditingStep] = useState<number | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Categories
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [isCreatingCategory, setIsCreatingCategory] = useState(false)

  // Step form state
  const [stepForm, setStepForm] = useState<StepFormState>({
    type: '', // 'temperature', 'position', 'rotation', 'action'
    time: '',
    temperature: '',
    position: '',
    rotation: '',
    action: ''
  })

  const actionOptions = [
    { value: 'rotate_90', label: 'Girar 90°' },
    { value: 'rotate_180', label: 'Girar 180°' },
    { value: 'move_up', label: 'Subir arriba' },
    { value: 'move_down', label: 'Bajar abajo' },
    { value: 'reset_position', label: 'Resetear posición' }
  ]

  const resetStepForm = () => {
    setStepForm({
      type: '',
      time: '',
      temperature: '',
      position: '',
      rotation: '',
      action: ''
    })
  }

  const openAddStepModal = () => {
    resetStepForm()
    setEditingStep(null)
    setIsModalOpen(true)
  }

  const openEditStepModal = (index: number) => {
    const step = steps[index]
    setStepForm({
      type: step.action ? 'action' : step.temperature ? 'temperature' : step.rotation ? 'rotation' : 'position',
      time: step.time?.toString() || '',
      temperature: step.temperature?.toString() || '',
      position: step.position?.toString() || '',
      rotation: step.rotation?.toString() || '',
      action: step.action || ''
    })
    setEditingStep(index)
    setIsModalOpen(true)
  }

  const handleStepSubmit = () => {
    if (!stepForm.type) return

    const newStep: ProgramStep = {}

    if (stepForm.type === 'action') {
      if (!stepForm.action) return
      newStep.action = stepForm.action
    } else {
      if (!stepForm.time) return
      newStep.time = parseInt(stepForm.time)

      if (stepForm.type === 'temperature') {
        if (!stepForm.temperature) return
        newStep.temperature = parseInt(stepForm.temperature)
      } else if (stepForm.type === 'position') {
        if (!stepForm.position) return
        const pos = parseInt(stepForm.position)
        if (isNaN(pos) || pos < 0 || pos > 100) {
          toast.error('La posición debe estar entre 0 y 100')
          return
        }
        newStep.position = pos
      } else if (stepForm.type === 'rotation') {
        if (!stepForm.rotation) return
        const inc = parseInt(stepForm.rotation)
        if (isNaN(inc) || inc < 0 || inc > 360) {
          toast.error('La rotación debe estar entre 0 y 360')
          return
        }
        newStep.rotation = inc
      }
    }

    if (editingStep !== null) {
      const updatedSteps = [...steps]
      updatedSteps[editingStep] = newStep
      setSteps(updatedSteps)
    } else {
      setSteps([...steps, newStep])
    }

    setIsModalOpen(false)
    resetStepForm()
  }

  const deleteStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index))
  }

  const moveStep = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === steps.length - 1)
    ) return

    const swapped = [...steps]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    const temp = swapped[index]
    swapped[index] = swapped[targetIndex]
    swapped[targetIndex] = temp
    setSteps(swapped)
  }

  // UI helper functions moved into `./components/StepsList`

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (steps.length === 0) {
      toast.error('Debes añadir al menos un paso al programa')
      return
    }

    // Categoría es opcional

    setIsSubmitting(true)

    try {
      const payload: Record<string, unknown> = {
        ...formData,
        stepsJson: JSON.stringify(steps)
      }
      if (selectedCategoryId !== null) payload.categoryId = selectedCategoryId

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/programs/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        toast.success('¡Programa creado correctamente!')
        setFormData({ name: '', description: '', creatorName: '' })
        setSteps([])
        setSelectedCategoryId(null)
      } else {
        const errorData = await response.json()
        toast.error('Error al crear el programa: ' + (errorData?.message || 'Error desconocido'))
      }
    } catch {
      toast.error('Error de conexión. Inténtalo de nuevo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      toast.error('El nombre de la categoría es obligatorio')
      return
    }

    setIsCreatingCategory(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/categories/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategoryName.trim() })
      })

      const data = await res.json()
      if (!res.ok || data?.success === false) {
        toast.error(data?.message || 'No se pudo crear la categoría')
        return
      }

      const newCat: Category = { id: data?.id ?? data?.categoryId ?? data?.data?.id, name: newCategoryName.trim() }
      // Update local list and select it
      setCategories(prev => {
        const exists = prev.some(c => c.id === newCat.id)
        return exists || !newCat.id ? prev : [...prev, newCat]
      })
      if (newCat.id) setSelectedCategoryId(newCat.id)
      setIsCategoryModalOpen(false)
      setNewCategoryName('')
      toast.success(data?.message || 'Categoría creada')
    } catch {
      toast.error('Error de conexión al crear la categoría')
    } finally {
      setIsCreatingCategory(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-4 px-4">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
            Crear Nuevo Programa
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Basic Information */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Información Básica
            </h2>
            
            <div className="space-y-4">
              <Input
                label="Nombre del Programa"
                value={formData.name}
                onChange={(value) => setFormData(prev => ({ ...prev, name: value }))}
                placeholder="Ej: Chuletón"
                required
                
              />
              
              <div>
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Select
                      label="Categoría"
                      value={selectedCategoryId ? String(selectedCategoryId) : ''}
                      onChange={(value) => setSelectedCategoryId(value ? Number(value) : null)}
                      options={[{ value: '', label: 'Sin categoría' }, ...categories.map(c => ({ value: String(c.id), label: c.name }))]}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setIsCategoryModalOpen(true)}
                    ariaLabel="Crear categoría"
                    className="h-10"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Textarea
                label="Descripción"
                value={formData.description}
                onChange={(value) => setFormData(prev => ({ ...prev, description: value }))}
                placeholder="Describe brevemente tu programa..."
                rows={2}
              />
              
              <Input
                label="Creador"
                value={formData.creatorName}
                onChange={(value) => setFormData(prev => ({ ...prev, creatorName: value }))}
                placeholder="Tu nombre"
                required
              />
            </div>
          </div>

          {/* Steps Section */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Pasos del Programa ({steps.length})
              </h2>
              <Button onClick={openAddStepModal} size="sm" ariaLabel="Añadir paso">
                <Plus className="h-4 w-4 mr-2" />
                Añadir Paso
              </Button>
            </div>
            <StepsList
              steps={steps}
              onMove={moveStep}
              onEdit={openEditStepModal}
              onDelete={deleteStep}
              actionOptions={actionOptions}
            />
          </div>

          {/* Submit Section */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <Button
              type="submit"
              disabled={isSubmitting || !formData.name || !formData.creatorName || steps.length === 0}
              className="w-full"
              size="lg"
            >
              {isSubmitting ? 'Creando Programa...' : 'Crear Programa'}
            </Button>
          </div>
        </form>

        {/* Step Modal */}
        <StepModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          stepForm={stepForm}
          setStepForm={setStepForm}
          onSubmit={handleStepSubmit}
          editingStep={editingStep}
          actionOptions={actionOptions}
        />

        {/* Create Category Modal */}
        <CategoryModal
          isOpen={isCategoryModalOpen}
          onClose={() => setIsCategoryModalOpen(false)}
          newCategoryName={newCategoryName}
          setNewCategoryName={setNewCategoryName}
          onCreate={handleCreateCategory}
          isCreating={isCreatingCategory}
        />
      </div>
    </div>
  )
}
