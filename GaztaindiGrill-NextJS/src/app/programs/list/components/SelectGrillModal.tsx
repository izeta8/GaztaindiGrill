"use client"

import { Modal } from "@/components/ui/Modal"
import { Button } from "@/components/ui/Button"
import type { Program } from "@/types" 
import { Loader } from "lucide-react"
import { useRunningPrograms } from "@/contexts/RunningProgramsContext" // Import the hook
import { useSimulatedGrill } from "@/app/control/hooks/useRunningStepNotices"
import { parseSteps, planSimulation, stepNotice } from "@/utils"

interface Props {
  isOpen: boolean
  onClose: () => void
  onSelect: (side: 0 | 1) => void
  program: Program | null
  loading?: boolean
}

function WarningLine() {
  return (
    <p className="mt-2 text-xs text-amber-700">
      Hay pasos que no harán lo escrito. Míralos en Control, en la ejecución del programa.
    </p>
  )
}

export function SelectGrillModal({ isOpen, onClose, onSelect, program, loading = false }: Props) {
  // Use the context hook directly
  const { runningPrograms } = useRunningPrograms();

  const leftGrillState = runningPrograms[0];
  const rightGrillState = runningPrograms[1];

  const isGrill0Busy = !!leftGrillState;
  const isGrill1Busy = !!rightGrillState;

  // Whether a step will not do what it says from where that grill is now. The steps themselves
  // are listed on /control once the program runs.
  const grill0 = useSimulatedGrill(0);
  const grill1 = useSimulatedGrill(1);
  const hasWarning = ({ pose, hasRotor }: typeof grill0) => {
    if (!program || !pose) return false;
    return planSimulation(parseSteps(program.stepsJson), program.referenceType, pose, { hasRotor })
      .some((simulated) => stepNotice(simulated)?.warning);
  };
  const warns0 = !loading && !isGrill0Busy && hasWarning(grill0);
  const warns1 = !loading && !isGrill1Busy && hasWarning(grill1);

  // Determine button text based on loading or data presence
  const leftGrillButtonText = () => {
    if (loading) return <span className="inline-flex items-center gap-2"><Loader className="h-4 w-4 animate-spin" /> Conectando...</span>;
    if (isGrill0Busy) return <span className="truncate" title={leftGrillState?.name || `Program ${leftGrillState.programId}`}>Ocupado: {leftGrillState.name || `Programa: ${leftGrillState?.programId}`}</span>;
    return 'Izquierda';
  };

  const rightGrillButtonText = () => {
    if (loading) return <span className="inline-flex items-center gap-2"><Loader className="h-4 w-4 animate-spin" /> Conectando...</span>;
    if (isGrill1Busy) return <span className="truncate" title={rightGrillState.name || `Program ${rightGrillState?.programId}`}>Ocupado: {rightGrillState.name || `Programa: ${rightGrillState.programId}`}</span>;
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
          <div>
            <Button
              onClick={() => onSelect(0)}
              className="w-full"
              disabled={loading || isGrill0Busy} // Disable if busy or loading state
              variant={isGrill0Busy ? "secondary" : "primary"}
            >
              {leftGrillButtonText()}
            </Button>
            {warns0 && <WarningLine />}
          </div>
          <div>
            <Button
              onClick={() => onSelect(1)}
              className="w-full"
              disabled={loading || isGrill1Busy} // Disable if busy or loading state
              variant={isGrill1Busy ? "secondary" : "primary"}
            >
              {rightGrillButtonText()}
            </Button>
            {warns1 && <WarningLine />}
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <Button onClick={onClose} variant="secondary" className="flex-1" disabled={loading}>Cancelar</Button>
        </div>
      </div>
    </Modal>
  )
}
