"use client"

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Pause, Info, User, BarChart3, LayoutGrid, Lock } from "lucide-react";
import { getStepIcon, getStepDescription, truncate } from "@/utils";
import { useRunningPrograms } from "@/contexts/RunningProgramsContext";

type ProgramExecutionStatusProps = {
  handleCancelPrograms: [(() => void), (() => void)];
  isConnected: boolean;
}

export function ProgramExecutionStatus({ handleCancelPrograms, isConnected }: ProgramExecutionStatusProps) {
  const { runningPrograms } = useRunningPrograms();
  const [activeTab, setActiveTab] = useState<0 | 1>(0);

  const hasProgram0 = !!runningPrograms[0];
  const hasProgram1 = !!runningPrograms[1];

  // Auto-seleccionar pestaña con programa si la actual no tiene y la otra sí
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

  const handleTabChange = (index: 0 | 1) => {
    if ((index === 0 && hasProgram0) || (index === 1 && hasProgram1)) {
      setActiveTab(index);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 mt-8 overflow-hidden transition-all duration-300">
      
      {/* TABS SELECTOR - CUADRADOS */}
      <div className="flex border-b border-gray-100 bg-gray-50/50">
        <button
          onClick={() => handleTabChange(0)}
          disabled={!hasProgram0}
          className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 border-r border-gray-100 ${
            activeTab === 0 
              ? "bg-white text-blue-600 border-b-2 border-b-blue-500" 
              : hasProgram0 
                ? "text-gray-400 hover:text-gray-600 hover:bg-gray-100" 
                : "text-gray-300 cursor-not-allowed opacity-50"
          }`}
        >
          {!hasProgram0 && <Lock className="h-3 w-3" />}
          Parrilla Izquierda 
          {hasProgram0 && <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />}
        </button>

        <button
          onClick={() => handleTabChange(1)}
          disabled={!hasProgram1}
          className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
            activeTab === 1 
              ? "bg-white text-blue-600 border-b-2 border-b-blue-500" 
              : hasProgram1 
                ? "text-gray-400 hover:text-gray-600 hover:bg-gray-100" 
                : "text-gray-300 cursor-not-allowed opacity-50"
          }`}
        >
          {!hasProgram1 && <Lock className="h-3 w-3" />}
          Parrilla Derecha
          {hasProgram1 && <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />}
        </button>
      </div>

      <div className="p-6">
        {!runningProgram ? (
          <div className="py-12 text-center flex flex-col items-center gap-3">
             <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
             <p className="text-gray-400 text-sm italic">Cargando detalles...</p>
          </div>
        ) : (
          <>
            {/* Program Header Compacto */}
            <div className="text-center mb-6">
              <h3 className="text-lg font-black text-gray-900 leading-tight uppercase tracking-tight">
                {programName}
              </h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                Paso {currentStepIndex + 1} de {runningProgram.steps.length}
              </p>
            </div>

            {/* Detalles Compactos Reestructurados */}
            <div className="mb-6 bg-gray-50/50 rounded-lg border border-gray-100 overflow-hidden">
              {/* Fila 1: Autor y Usos */}
              <div className="grid grid-cols-2 border-b border-gray-100">
                <div className="flex items-center gap-2 p-3 border-r border-gray-100">
                  <User className="h-3 w-3 text-gray-400 flex-shrink-0" />
                  <div className="flex flex-col min-w-0">
                    <span className="text-[8px] font-bold text-gray-400 uppercase leading-none mb-1">Autor</span>
                    <span className="text-[10px] font-bold text-gray-700 truncate">{runningProgram.creatorName ?? 'Sist.'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 p-3">
                  <BarChart3 className="h-3 w-3 text-gray-400 flex-shrink-0" />
                  <div className="flex flex-col min-w-0">
                    <span className="text-[8px] font-bold text-gray-400 uppercase leading-none mb-1">Usos</span>
                    <span className="text-[10px] font-bold text-gray-700">{runningProgram.usageCount ?? 0}</span>
                  </div>
                </div>
              </div>
              
              {/* Fila 2: Descripción (Ancho completo) */}
              <div className="p-3 flex items-start gap-2">
                <Info className="h-3 w-3 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="flex flex-col min-w-0">
                  <span className="text-[8px] font-bold text-gray-400 uppercase leading-none mb-1">Descripción</span>
                  <p className="text-[10px] font-bold text-gray-600 italic line-clamp-2 leading-relaxed">
                    {runningProgram.description || 'Sin descripción disponible para este programa.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Steps List */}
            <div className="mb-6">
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 px-1">Secuencia</h4>
              <div className="space-y-1.5 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                {runningProgram.steps.map((step, index) => {
                  const isPast = index < currentStepIndex;
                  const isCurrent = index === currentStepIndex;

                  return (
                    <div
                      key={index}
                      className={`
                        flex items-center gap-3 p-2.5 rounded-lg transition-all border
                        ${isCurrent 
                          ? 'bg-blue-50 border-blue-200 shadow-sm' 
                          : isPast 
                            ? 'bg-white border-transparent opacity-40' 
                            : 'bg-white border-gray-50 text-gray-500'}
                      `}
                    >
                      <span className={`
                        flex-shrink-0 w-6 h-6 rounded flex items-center justify-center text-[10px] font-black
                        ${isCurrent ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-400'}
                      `}>
                        {index + 1}
                      </span>
                      
                      <div className={`flex-shrink-0 scale-90 ${isCurrent ? 'text-blue-500' : 'text-gray-400'}`}>
                        {getStepIcon(step)}
                      </div>
                      
                      <span className={`text-[11px] font-semibold flex-grow ${isCurrent ? 'text-blue-900' : ''}`}>
                        {getStepDescription(step)}
                      </span>

                      {isCurrent && (
                        <div className="flex gap-0.5 h-2.5 items-end">
                          <div className="w-0.5 h-full bg-blue-500 animate-pulse" />
                          <div className="w-0.5 h-1/2 bg-blue-500 animate-pulse delay-75" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

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
    </div>
  );
}
