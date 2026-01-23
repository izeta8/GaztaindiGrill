"use client" // Keep client directive

import { Button } from "@/components/ui/Button";
// Import ProgramStep if needed for detailed display, otherwise remove
import { type EnrichedProgramStatus, type ProgramStep } from "@/lib/types";
import { Pause, Loader, AlertTriangle, Info, User, BarChart3 } from "lucide-react"; // Added Info, User, BarChart3 icons
// Import helpers
import { parseSteps, getStepIcon, getStepDescription, truncate } from "@/lib/utils"; // Added truncate
import { useMemo } from "react";
// Import the context hook
import { useRunningPrograms } from "@/contexts/RunningProgramsContext";

type ProgramExecutionStatusProps = {
    handleCancelProgram: () => void;
    isConnected: boolean;
    // Add grillIndex prop
    grillIndex: 0 | 1;
}

export function ProgramExecutionStatus({ handleCancelProgram, isConnected, grillIndex }: ProgramExecutionStatusProps) {
    // Get the state for the specific grill from the context
    const { getProgramOnGrill } = useRunningPrograms();
    const grillState = getProgramOnGrill(grillIndex);

    // Destructure for easier access
    const { isLoading, data: runningProgram, error } = grillState;

    // Safely get current step index, default to -1
    const currentStepIndex = runningProgram?.currentStepIndex ?? -1;
    // Derive program name safely
    const programName = runningProgram?.name || (runningProgram?.programId ? `Programa #${runningProgram.programId}` : 'Desconocido');

    // Parse steps only once using useMemo, handle potential undefined stepsJson
    const steps: ProgramStep[] = useMemo(() => {
        return parseSteps(runningProgram?.stepsJson ?? '[]'); // Default to empty array string
    }, [runningProgram?.stepsJson]);

    // Handle Loading state
    if (isLoading) {
        return (
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6 text-center text-gray-500">
                <Loader className="h-6 w-6 mx-auto mb-2 animate-spin text-blue-500" />
                Cargando datos del programa...
                 {/* Show partial data if available while loading */}
                {runningProgram && (
                     <p className="text-sm text-gray-400 mt-1">
                        (Ejecutando ID: {runningProgram.programId}, Paso: {currentStepIndex + 1})
                     </p>
                )}
            </div>
        );
    }

    // Handle Error state
    if (error) {
         return (
            <div className="bg-red-50 rounded-lg shadow-sm p-6 mb-6 text-center text-red-700">
                 <AlertTriangle className="h-6 w-6 mx-auto mb-2 text-red-500" />
                 Error al cargar datos: {error}
                 {/* Show partial data if available on error */}
                 {runningProgram && (
                     <p className="text-sm text-red-500 mt-1">
                        (Ejecutando ID: {runningProgram.programId}, Paso: {currentStepIndex + 1})
                     </p>
                 )}
                  {/* Still allow cancelling even if API data failed */}
                 <div className="mt-4">
                     <Button
                         onClick={handleCancelProgram}
                         disabled={!isConnected || !runningProgram?.isRunning} // Disable based on MQTT isRunning flag
                         variant="danger"
                         size="sm"
                     >
                         <Pause className="h-4 w-4 mr-1" /> Forzar Cancelación
                     </Button>
                 </div>
            </div>
         );
    }


    // Handle case where no program is running (data is null and no error/loading)
    if (!runningProgram) {
        return (
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6 text-center text-gray-500">
                No hay ningún programa en ejecución en la Parrilla {grillIndex}.
            </div>
        );
    }

    // --- Program is running and data is loaded ---
    return (
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            {/* Program Title */}
            <h3 className="text-lg font-semibold text-gray-900 mb-1 text-center">
                Ejecutando: <span className="italic">{programName}</span>
            </h3>
            <p className="text-sm text-gray-500 mb-4 text-center">
                Paso {currentStepIndex + 1} de {steps.length}
            </p>

            {/* --- NEW: Program Info Section --- */}
            <div className="mb-4 border-t border-b border-gray-200 py-3 text-xs text-gray-600 space-y-1.5">
                <div className="flex items-center gap-2">
                    <User className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                    <span className="font-medium text-gray-800 w-16 flex-shrink-0">Creador:</span>
                    <span className="truncate">{runningProgram.creatorName ?? '-'}</span>
                </div>
                <div className="flex items-center gap-2">
                    <BarChart3 className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                    <span className="font-medium text-gray-800 w-16 flex-shrink-0">Usos:</span>
                    <span>{runningProgram.usageCount ?? 0}</span>
                </div>
                <div className="flex items-start gap-2">
                    <Info className="h-3.5 w-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                    <span className="font-medium text-gray-800 w-16 flex-shrink-0">Descrip.:</span>
                    {/* Use truncate helper */}
                    <span className="line-clamp-2" title={runningProgram.description}>
                        {truncate(runningProgram.description, 100) || '-'}
                    </span>
                </div>
            </div>
             {/* --- End of New Section --- */}


            {/* Steps List */}
            <div className="mb-6 max-h-60 overflow-y-auto pr-2 border-b border-gray-200 pb-3">
                 <h4 className="text-sm font-medium text-gray-700 mb-3 sticky top-0 bg-white py-1 z-10">Pasos:</h4>
                {steps.length > 0 ? (
                    <ol className="list-decimal list-inside space-y-2 relative"> {/* Added relative for z-index */}
                        {steps.map((step, index) => {
                            const isPast = index < currentStepIndex;
                            const isCurrent = index === currentStepIndex;

                            return (
                                <li
                                    key={index}
                                    className={`
                                        flex items-start gap-2 text-sm p-2 rounded transition-colors duration-200
                                        ${isCurrent ? 'bg-blue-100 text-blue-900 font-medium ring-1 ring-blue-300' : ''}
                                        ${isPast ? 'text-gray-400 opacity-70' : 'text-gray-700'}
                                    `}
                                >
                                    {/* Number */}
                                    <span className={`flex-shrink-0 w-5 text-right ${isCurrent ? 'font-semibold' : ''} ${isPast ? 'text-gray-400' : 'text-gray-500'}`}>
                                        {index + 1}.
                                    </span>
                                    {/* Icon */}
                                    <span className={`${isCurrent ? 'text-blue-700' : isPast ? 'text-gray-400' : 'text-gray-500'}`}>
                                        {getStepIcon(step)}
                                    </span>
                                    {/* Description */}
                                    <span className="flex-grow">{getStepDescription(step)}</span>
                                </li>
                            );
                        })}
                    </ol>
                ) : (
                    <p className="text-sm text-gray-500 text-center py-4">Este programa no tiene pasos definidos.</p>
                )}
            </div>

            {/* System Controls / Cancel Button */}
            <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Sistema</h4>
                <div className="grid grid-cols-1 gap-2">
                    <Button
                        onClick={handleCancelProgram}
                        // Disable if not connected OR if the program status explicitly says it's not running
                        disabled={!isConnected || !runningProgram?.isRunning}
                        variant="danger"
                        size="sm"
                    >
                        <Pause className="h-4 w-4 mr-1" /> Cancelar Programa
                    </Button>
                </div>
            </div>
        </div>
    );
}

