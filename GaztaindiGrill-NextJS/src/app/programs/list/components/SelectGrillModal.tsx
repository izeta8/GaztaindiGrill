"use client"

import { Modal } from "@/components/ui/Modal"
import { Button } from "@/components/ui/Button"
import type { Program } from "../../../../../types" // Remove EnrichedProgramStatus if not used elsewhere
import { Loader } from "lucide-react"
import { useRunningPrograms } from "@/contexts/RunningProgramsContext" // Import the hook

interface Props {
  isOpen: boolean
  onClose: () => void
  onSelect: (side: 0 | 1) => void
  program: Program | null
  loading?: boolean
  // runningPrograms prop is removed
}

export function SelectGrillModal({ isOpen, onClose, onSelect, program, loading = false }: Props) {
  // Use the context hook directly
  const { runningPrograms } = useRunningPrograms();

  // The rest of the logic remains the same, using the 'runningPrograms' from the hook
  const leftGrillState = runningPrograms[0]; // State is now { isLoading, data, error }
  const rightGrillState = runningPrograms[1];

  const isGrill0Busy = !!leftGrillState.data; // Check if data exists
  const isGrill1Busy = !!rightGrillState.data;

  // Determine button text based on loading or data presence
  const leftGrillButtonText = () => {
    if (loading) return <span className="inline-flex items-center gap-2"><Loader className="h-4 w-4 animate-spin" /> Conectando...</span>;
    if (leftGrillState.isLoading) return <span className="inline-flex items-center gap-2"><Loader className="h-4 w-4 animate-spin" /> Cargando...</span>;
    if (isGrill0Busy) return <span className="truncate" title={leftGrillState.data?.name || `Program ${leftGrillState.data?.programId}`}>Ocupado: {leftGrillState.data?.name || `Programa: ${leftGrillState.data?.programId}`}</span>;
    return 'Izquierda';
  };

  const rightGrillButtonText = () => {
    if (loading) return <span className="inline-flex items-center gap-2"><Loader className="h-4 w-4 animate-spin" /> Conectando...</span>;
    if (rightGrillState.isLoading) return <span className="inline-flex items-center gap-2"><Loader className="h-4 w-4 animate-spin" /> Cargando...</span>;
    if (isGrill1Busy) return <span className="truncate" title={rightGrillState.data?.name || `Program ${rightGrillState.data?.programId}`}>Ocupado: {rightGrillState.data?.name || `Programa: ${rightGrillState.data?.programId}`}</span>;
    return 'Derecha';
  };


  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Seleccionar parrilla</h3>
        <p className="text-sm text-gray-700 mb-4">
          {program ? (
            <>¿En qué parrilla quieres ejecutar &quot;{program.name}&quot;?</>
          ) : (
            '¿En qué parrilla quieres ejecutar el programa?'
          )}
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={() => onSelect(0)}
            className="w-full"
            disabled={loading || isGrill0Busy || leftGrillState.isLoading} // Disable if busy or loading state
            variant={isGrill0Busy || leftGrillState.isLoading ? "secondary" : "primary"}
          >
            {leftGrillButtonText()}
          </Button>
          <Button
            onClick={() => onSelect(1)}
            className="w-full"
            disabled={loading || isGrill1Busy || rightGrillState.isLoading} // Disable if busy or loading state
            variant={isGrill1Busy || rightGrillState.isLoading ? "secondary" : "primary"}
          >
            {rightGrillButtonText()}
          </Button>
        </div>
        <div className="flex gap-3 mt-6">
          <Button onClick={onClose} variant="secondary" className="flex-1" disabled={loading}>Cancelar</Button>
        </div>
      </div>
    </Modal>
  )
}
