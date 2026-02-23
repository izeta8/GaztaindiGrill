"use client"

import { BarChart3, Calendar, Pencil, Play, Tag, Eye, Trash2, User, FlameKindling } from "lucide-react"
import { Button } from "@/components/ui/Button"
import type { Program } from "@/types"
import { formatDate } from "@/utils"
import { useState } from "react"
import { Modal } from "@/components/ui/Modal"
import { toast } from "sonner"
import { useRunningPrograms } from "@/contexts/RunningProgramsContext"

interface Props {
  program: Program
  categoryName: string
  stepsCount: number
  onViewSteps: (program: Program) => void
  onExecute: (program: Program) => void
  onEdit: (program: Program) => void
}

export function ProgramCard({ program: p, categoryName, stepsCount, onViewSteps, onExecute, onEdit }: Props) {
  const { runningPrograms, isProgramRunning } = useRunningPrograms();
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmChecked, setConfirmChecked] = useState(false)

  // Check current running status using the context hook
  const grill0State = runningPrograms[0];
  const grill1State = runningPrograms[1];
  const isAnyGrillFree = !grill0State || !grill1State; // Check if at least one grill's data is null
  const { isRunning: isThisProgramRunning, grillIndex } = isProgramRunning(p.id);

  // Execute button is disabled if this program is already running OR if no grills are free.
  const canExecute = !isThisProgramRunning && isAnyGrillFree;

  const confirmDelete = async () => {
    if (!p?.id) {
      setIsDeleteOpen(false)
      return
    }
    try {
      setDeleting(true)
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/programs/${p.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('No se pudo eliminar el programa') // User text in Spanish
      toast.success(`Programa "${p.name}" eliminado`) // User text in Spanish
      window.location.reload() // Reload to reflect deletion
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al eliminar el programa' // User text in Spanish
      toast.error(msg)
    } finally {
      setDeleting(false)
      setIsDeleteOpen(false)
      setConfirmChecked(false)
    }
  }

  return (
    // Highlight card if this program is running
    <div className={`p-4 border rounded-lg bg-gray-50 transition-all ${isThisProgramRunning ? 'border-blue-400 ring-2 ring-blue-200' : 'border-gray-200'}`}>
      <div className="grid grid-cols-1 md:grid-cols-3 items-start">

        {/* Program Info Section */}
        <div className="md:col-span-2 min-w-0">
          <div className="flex justify-between items-center gap-2">
            {/* Name and ID */}
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex text-md px-4 gap-2 py-0.5 rounded-full bg-gray-200 w-fit text-base items-center">
                <h3 className="italic font-semibold text-gray-900 truncate" title={p.name}>{p.name}</h3>
                <span className="italic opacity-75 text-xs"># {p.id}</span>
              </div>
            </div>
            {/* Category */}
            <span className="w-fit text-[11px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 inline-flex items-center gap-1" aria-label={`Categoría ${categoryName}`}>
              <Tag className="h-3.5 w-3.5" /> {categoryName}
            </span>
          </div>

          {/* Description */}
          <p className="text-sm text-gray-700 my-5">
            {p.description}
          </p>

          {/* Metadata */}
          <div className="my-6 grid grid-cols-2 gap-x-4 gap-y-2 text-xs text-gray-700">
            <div className="flex items-center gap-2">
              <User className="h-3.5 w-3.5 text-gray-500" />
              <span className="font-medium">Creador:</span> {p.creatorName}
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-gray-500" />
              <span className="font-medium">Actualiz.:</span> <span title={formatDate(p.updateDate)}>{formatDate(p.updateDate)}</span>
            </div>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-3.5 w-3.5 text-gray-500" />
              <span className="font-medium">Usos:</span> {p.usageCount ?? 0}
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-gray-500" />
              <span className="font-medium">Creación:</span> <span title={formatDate(p.creationDate)}>{formatDate(p.creationDate)}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons Section */}
        <div className="grid grid-cols-2 md:flex-col gap-2 md:justify-start justify-end md:items-stretch items-end">
                             
        
          {/* Execute Button */}
          <Button
            onClick={() => onExecute(p)}
            size="sm"
            aria-label={`Ejecutar ${p.name}`} // User text in Spanish
            className="w-full md:w-auto"
            disabled={!canExecute}
          >
            {isThisProgramRunning ? (
                <>
                    <FlameKindling className="h-4 w-4 mr-2" />
                    {/* User text in Spanish */}
                    <span>En Parrilla {grillIndex === 0 ? 'Izq.' : 'Der.'}</span>
                </>
            ) : (
                <>
                    <Play className="h-4 w-4 mr-2" />
                    <span>Ejecutar</span>{/* User text in Spanish */}
                </>
            )}
          </Button>

          {/* Delete Button */}
          <Button
            variant="danger"
            size="sm"
            aria-label={`Eliminar ${p.name}`} // User text in Spanish
            className="w-full md:w-auto"
            onClick={() => setIsDeleteOpen(true)}
          >
            <Trash2 className="h-4 w-4 mr-2" /> Eliminar {/* User text in Spanish */}
          </Button>

          {/* Edit Button */}
          <Button variant="secondary" onClick={() => onEdit(p)} size="sm" aria-label={`Editar ${p.name}`} className="w-full md:w-auto">
            <Pencil className="h-4 w-4 mr-2" /> Editar {/* User text in Spanish */}
          </Button>

          {/* View Steps Button */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onViewSteps(p)}
            aria-label={`Ver pasos de ${p.name}`} // User text in Spanish
          >
            <Eye className="h-4 w-4 mr-2" /> Ver pasos ({stepsCount}) {/* User text in Spanish */}
          </Button>

        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={isDeleteOpen} onClose={() => (deleting ? null : setIsDeleteOpen(false))}>
        <div className="p-5">
          <h2 id="delete-program-title" className="text-lg font-semibold text-gray-900 mb-2">
            Confirmar eliminación {/* User text in Spanish */}
          </h2>
          {/* User text in Spanish */}
          <p className="text-sm text-gray-700 mb-4">
            ¿Seguro que deseas eliminar el programa <span className="font-medium">{p.name}</span>?
            {` `}Tiene <span className="font-medium">{stepsCount}</span> {stepsCount === 1 ? 'paso' : 'pasos'}. Esta acción no se puede deshacer.
          </p>
          {/* User text in Spanish */}
          <label className="flex items-start gap-2 text-sm text-gray-700 mb-4 select-none">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4"
              checked={confirmChecked}
              onChange={(e) => setConfirmChecked(e.target.checked)}
              disabled={deleting}
              aria-label="Confirmar eliminación" // User text in Spanish (Accessibility)
            />
            <span>Entiendo que esta acción es irreversible.</span>{/* User text in Spanish */}
          </label>
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsDeleteOpen(false)}
              disabled={deleting}
            >
              Cancelar {/* User text in Spanish */}
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={confirmDelete}
              disabled={deleting || !confirmChecked}
              aria-label={`Confirmar eliminación de ${p.name}`} // User text in Spanish (Accessibility)
            >
              {deleting ? 'Eliminando...' : 'Eliminar'} {/* User text in Spanish */}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
