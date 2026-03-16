"use client";

import React from "react";
import { useMqtt } from "@/hooks/useMqtt";
import { useCurrentMode } from "@/contexts/CurrentModeContext";
import { useRunningPrograms } from "@/contexts/RunningProgramsContext";
import { 
  Flame, Hand, Smartphone, Heater, 
  ArrowDownUp, ArrowsUpFromLine 
} from "lucide-react";
import { ConnectionStatus, GrillModes } from "@/types";
import { cn } from "@/utils";
import { COLORS } from "@/constants";

export const GlobalStatusDock = () => {
  const { espConnectionStatus, clientConnectionStatus } = useMqtt();
  const { currentMode } = useCurrentMode();
  const { runningPrograms } = useRunningPrograms();

  const isGrillRunning = (idx: 0 | 1) => runningPrograms[idx]?.isRunning;

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[100] w-fit">
      <div className="flex items-center gap-3 px-4 py-2 bg-white/70 backdrop-blur-md border border-white/20 shadow-lg rounded-full ring-1 ring-black/5">
        
        {/* Conectividad */}
        <div className="flex gap-3">
          <StatusDot status={clientConnectionStatus} icon={<Smartphone className="w-4 h-4 text-white" />} title="App" />
          <StatusDot status={espConnectionStatus} icon={<Heater className="w-4 h-4 text-white" />} title="Parrilla" />
        </div>

        <div className="h-4 w-px bg-gray-500 mx-1" />

        {/* Modo */}
        <div className="flex items-center" title={`Modo: ${currentMode}`}>
          {currentMode === GrillModes.Dual ? (
            <ArrowsUpFromLine className={`w-5 h-5 text-${COLORS.SINGLE_MODE}-600`} />
          ) : (
            <ArrowDownUp className={`w-5 h-5 text-${COLORS.DUAL_MODE}-600`} />
          )}
        </div>

        <div className="h-4 w-px bg-gray-500 mx-1" />

        {/* Programas Ejecutando */}
        <div className="flex items-center gap-2">
          <GrillIndicator side="I" isRunning={isGrillRunning(0)} />
          <GrillIndicator side="D" isRunning={isGrillRunning(1)} />
        </div>
      </div>
    </div>
  );
};

// Componente para los puntos de estado tipo "notificación"
const StatusDot = ({ status, icon, title }: { status: ConnectionStatus, icon: React.ReactNode, title: string }) => {
  const colors = {
    [ConnectionStatus.Online]: "bg-green-500",
    [ConnectionStatus.Connecting]: "bg-yellow-500 animate-pulse",
    [ConnectionStatus.Offline]: "bg-red-500",
  };

  return (
    <div className={cn("relative p-1 rounded-full shadow-sm", colors[status])} title={title}>
      {icon}
    </div>
  );
};

// Indicador minimalista para cada parrilla
const GrillIndicator = ({ side, isRunning }: { side: string, isRunning?: boolean }) => (
  <div className="flex items-center gap-1">
    <span className="text-[12px] font-bold text-gray-500">{side}</span>
    {isRunning ? (
      <Flame className="w-4 h-4 text-orange-500 animate-pulse" />
    ) : (
      <Hand className="w-4 h-4 text-gray-800" />
    )}
  </div>
);