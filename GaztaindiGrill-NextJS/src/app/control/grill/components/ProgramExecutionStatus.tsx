import { Button } from "@/components/ui/Button";
import { RunningProgramStatus } from "@/lib/types";
import { Pause } from "lucide-react";


type ProgramExecutionStatusProps = {
    handleCancelProgram: () => void
    isConnected: boolean
    runningProgram: RunningProgramStatus
}

export function ProgramExecutionStatus({handleCancelProgram, runningProgram, isConnected}: ProgramExecutionStatusProps ){

    return (

        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Sistema</h4>
          <div className="grid grid-cols-1 gap-2">
            <Button onClick={handleCancelProgram} disabled={!isConnected || !runningProgram.isRunning} variant="danger" size="sm">
              <Pause className="h-4 w-4 mr-1" /> Cancelar Programa
            </Button>
          </div>
        </div>

    )

}