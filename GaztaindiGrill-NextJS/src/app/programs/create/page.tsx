"use client"

import { useState, useEffect, type ReactNode } from 'react'
import { Plus, Trash2, Edit2, Clock, Thermometer, Target, ArrowUp, MoveVertical, RotateCw } from 'lucide-react'
import { ProgramStep } from '@/lib/types'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Select } from '@/components/ui/Select'
import { toast } from 'sonner'

// Explicit step types for clarity
type StepType = 'temperature' | 'position' | 'rotation' | 'action' | ''

type StepFormState = {
  type: StepType
  time: string
  temperature: string
  position: string
  rotation: string
  action: string
}

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

  const getStepIcon = (step: ProgramStep) => {
    if (step.action) return <Target className="h-5 w-5" />
    if (step.temperature) return <Thermometer className="h-7 w-7" />
    if (step.position) return <MoveVertical className="h-5 w-5" />
    if (step.rotation) return <RotateCw className="h-5 w-5" />
    return <Clock className="h-5 w-5" />
  }

  const formatSeconds = (seconds: number) => {
    if (seconds > 60) {
      const m = Math.floor(seconds / 60)
      const s = seconds % 60
      return `${m}m ${s}s`
    }
    return `${seconds}s`
  }

  const getStepDescription = (step: ProgramStep): ReactNode => {
    if (step.action) {
      const actionLabel = actionOptions.find(opt => opt.value === step.action)?.label || step.action
      return (
        <div className="leading-tight">
          <div><span className="font-medium">Acción:</span> {actionLabel}</div>
        </div>
      )
    }
    if (step.temperature) {
      return (
        <div className="leading-tight">
          <div><span className="font-medium">Temperatura:</span> {step.temperature}°C</div>
          <div><span className="font-medium">Tiempo:</span> {formatSeconds(step.time as number)}</div>
        </div>
      )
    }
    if (step.position) {
      return (
        <div className="leading-tight">
          <div><span className="font-medium">Posición:</span> {step.position}</div>
          <div><span className="font-medium">Tiempo:</span> {formatSeconds(step.time as number)}</div>
        </div>
      )
    }
    if (step.rotation) {
      return (
        <div className="leading-tight">
          <div><span className="font-medium">Inclinación:</span> {step.rotation}°</div>
          <div><span className="font-medium">Tiempo:</span> {formatSeconds(step.time as number)}</div>
        </div>
      )
    }
    return <div className="leading-tight">Paso desconocido</div>
  }

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

            {steps.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Clock className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No hay pasos añadidos</p>
                <p className="text-sm">Haz clic en &quot;Añadir Paso&quot; para comenzar</p>
              </div>
            ) : (
              <div className="space-y-3">
                {steps.map((step, index) => (
                  
                  <div
                    key={index}
                    className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg bg-gray-50"
                  >
                    <div className="flex items-center gap-2 text-gray-600">
                      <span className="font-medium text-sm">#{index + 1}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 flex-1">
                      {getStepIcon(step)}
                      <span className="text-sm font-medium">
                        {getStepDescription(step)}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-1 grid grid-cols-2">
                      
                      <Button
                        onClick={() => moveStep(index, 'up')}
                        variant="secondary"
                        size="sm"
                        disabled={index === 0}
                        className="p-2"
                        ariaLabel={`Mover paso ${index + 1} arriba`}
                      >
                        <ArrowUp className="h-3 w-3" />
                      </Button>
                      
                      <Button
                        onClick={() => moveStep(index, 'down')}
                        variant="secondary"
                        size="sm"
                        disabled={index === steps.length - 1}
                        className="p-2 rotate-180"
                        ariaLabel={`Mover paso ${index + 1} abajo`}
                      >
                        <ArrowUp className="h-3 w-3" />
                      </Button>

                      <Button
                        onClick={() => openEditStepModal(index)}
                        variant="secondary"
                        size="sm"
                        className="p-2"
                        ariaLabel={`Editar paso ${index + 1}`}
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>

                      <Button
                        onClick={() => deleteStep(index)}
                        variant="danger"
                        size="sm"
                        className="p-2"
                        ariaLabel={`Eliminar paso ${index + 1}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>

                    </div>

                  </div>
                ))}
              </div>
            )}
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
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4" id="step-modal-title">
              {editingStep !== null ? 'Editar Paso' : 'Añadir Nuevo Paso'}
            </h3>
            
            <div className="space-y-4">
              <Select
                label="Tipo de Paso"
                value={stepForm.type}
                onChange={(value) => setStepForm(prev => ({ ...prev, type: value as StepType }))}
                options={[
                  { value: 'temperature', label: 'Temperatura' },
                  { value: 'position', label: 'Posición' },
                  { value: 'rotation', label: 'Rotación' },
                  { value: 'action', label: 'Acción' }
                ]}
                required
              />

              {stepForm.type === 'temperature' && (
                <>
                  <Input
                    label="Temperatura (°C)"
                    type="number"
                    value={stepForm.temperature}
                    onChange={(value) => setStepForm(prev => ({ ...prev, temperature: value }))}
                    placeholder="300"
                    min={0}
                    max={500}
                    required
                  />
                  <Input
                    label="Tiempo (segundos)"
                    type="number"
                    value={stepForm.time}
                    onChange={(value) => setStepForm(prev => ({ ...prev, time: value }))}
                    placeholder="60"
                    min={1}
                    required
                  />
                </>
              )}

              {stepForm.type === 'position' && (
                <>
                  <Input
                    label="Posición"
                    type="number"
                    value={stepForm.position}
                    onChange={(value) => {
                      const n = Number(value)
                      if (Number.isNaN(n)) {
                        setStepForm(prev => ({ ...prev, position: '' }))
                        return
                      }
                      const clamped = Math.max(0, Math.min(100, Math.floor(n)))
                      setStepForm(prev => ({ ...prev, position: String(clamped) }))
                    }}
                    placeholder="80"
                    min={0}
                    max={100}
                    required
                  />
                  <Input
                    label="Tiempo (segundos)"
                    type="number"
                    value={stepForm.time}
                    onChange={(value) => setStepForm(prev => ({ ...prev, time: value }))}
                    placeholder="30"
                    min={1}
                    required
                  />
                </>
              )}

              {stepForm.type === 'rotation' && (
                <>
                  <Input
                    label="Rotación (°)"
                    type="number"
                    value={stepForm.rotation}
                    onChange={(value) => {
                      const n = Number(value)
                      if (Number.isNaN(n)) {
                        setStepForm(prev => ({ ...prev, rotation: '' }))
                        return
                      }
                      const clamped = Math.max(0, Math.min(360, Math.floor(n)))
                      setStepForm(prev => ({ ...prev, rotation: String(clamped) }))
                    }}
                    placeholder="45"
                    min={0}
                    max={360}
                    required
                  />
                  <Input
                    label="Tiempo (segundos)"
                    type="number"
                    value={stepForm.time}
                    onChange={(value) => setStepForm(prev => ({ ...prev, time: value }))}
                    placeholder="30"
                    min={1}
                    required
                  />
                </>
              )}

              {stepForm.type === 'action' && (
                <Select
                  label="Acción"
                  value={stepForm.action}
                  onChange={(value) => setStepForm(prev => ({ ...prev, action: value }))}
                  options={actionOptions}
                  required
                />
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                onClick={() => setIsModalOpen(false)}
                variant="secondary"
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleStepSubmit}
                className="flex-1"
                disabled={
                  !stepForm.type ||
                  (stepForm.type === 'temperature' && (!stepForm.temperature || !stepForm.time)) ||
                  (stepForm.type === 'position' && (!stepForm.position || !stepForm.time)) ||
                  (stepForm.type === 'action' && !stepForm.action)
                }
              >
                {editingStep !== null ? 'Actualizar' : 'Añadir'}
              </Button>
            </div>
          </div>
        </Modal>

        {/* Create Category Modal */}
        <Modal isOpen={isCategoryModalOpen} onClose={() => !isCreatingCategory && setIsCategoryModalOpen(false)}>
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
                onClick={() => setIsCategoryModalOpen(false)}
                variant="secondary"
                className="flex-1"
                disabled={isCreatingCategory}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCreateCategory}
                className="flex-1"
                disabled={isCreatingCategory || !newCategoryName.trim()}
              >
                {isCreatingCategory ? 'Creando...' : 'Crear'}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  )
}
