"use client"

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Pause, LayoutGrid, SkipForward } from "lucide-react";
import { useRunningPrograms } from "@/contexts/RunningProgramsContext";
import { ExecutionTabs } from "./execution/ExecutionTabs";
import { ExecutionDetails } from "./execution/ExecutionDetails";
import { ExecutionSteps } from "./execution/ExecutionSteps";
import { TemperatureHoldLine } from "./execution/TemperatureHoldLine";
import { StepModal, type StepFormState } from "@/app/programs/components/StepModal";
import { EMPTY_STEP_FORM, formToStep, stepToForm } from "@/app/programs/utils/stepForm";
import type { ProgramStep } from "@/types";
import { secondsSince } from "@/app/control/hooks/useSecondsSince";
import { useRunningStepNotices } from "@/app/control/hooks/useRunningStepNotices";

type EditStep = (index: number, step: ProgramStep) => void;

type ProgramExecutionStatusProps = {
  handleCancelPrograms: [(() => void), (() => void)];
  handleSkipSteps: [(() => void), (() => void)];
  handleEditSteps: [EditStep, EditStep];
  isConnected: boolean;
}

export function ProgramExecutionStatus({ handleCancelPrograms, handleSkipSteps, handleEditSteps, isConnected }: ProgramExecutionStatusProps) {
  const { runningPrograms } = useRunningPrograms();
  const [activeTab, setActiveTab] = useState<0 | 1>(0);

  // The step being edited for this run, and its form.
  const [editingStep, setEditingStep] = useState<number | null>(null);
  const [stepForm, setStepForm] = useState<StepFormState>(EMPTY_STEP_FORM);
  // The wait under way opens with the time it has left; the firmware starts it again on save.
  const [editsWaitUnderWay, setEditsWaitUnderWay] = useState(false);

  const { notices } = useRunningStepNotices(activeTab, runningPrograms[activeTab]);

  const hasProgram0 = !!runningPrograms[0];
  const hasProgram1 = !!runningPrograms[1];

  useEffect(() => {
    if (hasProgram0 && !hasProgram1 && activeTab === 1) {
      setActiveTab(0);
    } else if (hasProgram1 && !hasProgram0 && activeTab === 0) {
      setActiveTab(1);
    }
  }, [hasProgram0, hasProgram1, activeTab]);

  if (!hasProgram0 && !hasProgram1) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 mt-8 text-center flex flex-col items-center gap-3 animate-in fade-in duration-500">
        <LayoutGrid className="h-8 w-8 text-gray-200" />
        <p className="text-gray-400 font-medium text-sm italic">No hay programas en ejecución actualmente.</p>
      </div>
    );
  }

  const runningProgram = runningPrograms[activeTab];
  const currentStepIndex = runningProgram?.currentStepIndex ?? -1;
  const programName = runningProgram?.name || (runningProgram?.programId ? `Programa #${runningProgram.programId}` : 'Desconocido');

  const referenceType = runningProgram?.referenceType ?? 'absolute';

  const openEditStep = (index: number) => {
    if (!runningProgram) return;
    const step = runningProgram.steps[index];
    const elapsed = index === currentStepIndex && step.time != null ? secondsSince(step.stepStartUnix) : null;
    setEditsWaitUnderWay(elapsed !== null);
    setStepForm(stepToForm(elapsed === null ? step : { time: Math.max(0, step.time! - elapsed) }));
    setEditingStep(index);
  };

  const handleEditSubmit = () => {
    if (editingStep === null) return;
    const result = formToStep(stepForm, referenceType);
    if (!result) return;
    if ('error' in result) {
      toast.error(result.error);
      return;
    }
    handleEditSteps[activeTab](editingStep, result.step);
    setEditingStep(null);
  };

  const handleTabChange = (index: 0 | 1) => {
    if ((index === 0 && hasProgram0) || (index === 1 && hasProgram1)) {
      setActiveTab(index);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 mt-8 overflow-hidden transition-all duration-300">
      
      <ExecutionTabs 
        activeTab={activeTab} 
        hasProgram0={hasProgram0} 
        hasProgram1={hasProgram1} 
        onTabChange={handleTabChange} 
      />

      <div className="p-6">
        {!runningProgram ? (
          <div className="py-12 text-center flex flex-col items-center gap-3">
             <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
             <p className="text-gray-400 text-sm italic">Cargando detalles...</p>
          </div>
        ) : (
          <>
            <div className="text-center mb-6">
              <h3 className="text-lg font-black text-gray-900 leading-tight uppercase tracking-tight">
                {programName}
              </h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                Paso {currentStepIndex + 1} de {runningProgram.steps.length}
              </p>
              {runningProgram.hold && (
                <TemperatureHoldLine hold={runningProgram.hold} grillIndex={activeTab} />
              )}
            </div>

            <ExecutionDetails runningProgram={runningProgram} />

            <ExecutionSteps 
              steps={runningProgram.steps} 
              currentStepIndex={currentStepIndex} 
              notices={notices}
              onEdit={isConnected && runningProgram.isRunning ? openEditStep : undefined}
            />

            <Button
              onClick={() => handleSkipSteps[activeTab]()}
              disabled={!isConnected || !runningProgram?.isRunning}
              variant="secondary"
              className="w-full py-3 mb-2 rounded-lg text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all"
            >
              <SkipForward className="h-3.5 w-3.5 mr-2" /> Saltar Paso
            </Button>

            <Button
              onClick={() => {
                if (window.confirm(`¿Cancelar programa en parrilla ${activeTab === 0 ? 'Izquierda' : 'Derecha'}?`)) {
                  handleCancelPrograms[activeTab]();
                }
              }}
              disabled={!isConnected || !runningProgram?.isRunning}
              variant="danger"
              className="w-full py-3 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-md shadow-red-500/5 hover:shadow-red-500/10 active:scale-95 transition-all"
            >
              <Pause className="h-3.5 w-3.5 mr-2" /> Cancelar Programa
            </Button>
          </>
        )}
      </div>

      <StepModal
        referenceType={referenceType}
        isOpen={editingStep !== null}
        onClose={() => setEditingStep(null)}
        stepForm={stepForm}
        setStepForm={setStepForm}
        onSubmit={handleEditSubmit}
        editingStep={editingStep}
        lockedType
        note={editsWaitUnderWay ? 'Esta espera ya está en marcha: empezará de nuevo con el tiempo que pongas.' : undefined}
      />
    </div>
  );
}
