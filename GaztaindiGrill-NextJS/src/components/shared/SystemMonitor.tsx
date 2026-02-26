

"use client";

import React from "react";
import { useMqtt } from "@/hooks/useMqtt";
import { useCurrentMode } from "@/contexts/CurrentModeContext";
import { useRunningPrograms } from "@/contexts/RunningProgramsContext";
import { BaseBadge } from "./BaseBadge";
import { 
  Flame, 
  Hand, 
  Smartphone, 
  Heater, 
  ArrowDownUp, 
  ArrowsUpFromLine, 
  Loader2 
} from "lucide-react";
import { ConnectionStatus, GrillModes, RunningPrograms, type GrillMode } from "@/types";
import { COLORS } from "@/constants";


interface SystemMonitorProps {
  pageTitle: string;
  pageDescription?: string;
}

export const SystemMonitor = ({pageTitle, pageDescription}: SystemMonitorProps) => {

  const { espConnectionStatus, clientConnectionStatus } = useMqtt();
  const { currentMode } = useCurrentMode();
  const { runningPrograms } = useRunningPrograms();

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">

      {/* Title and description */}
      <div className="text-center mb-4">
        <h1 className="text-2xl font-bold text-gray-900">
          {pageTitle}
        </h1>
        <p className="text-sm text-gray-600">
          {pageDescription}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2 text-sm border-t pt-4">
        
        {/* Infrastructure Group */}
        <div className="flex items-center space-x-2">
          {renderConnectionBadge(clientConnectionStatus, Smartphone)}
          {renderConnectionBadge(espConnectionStatus, Heater)}
        </div>

        <div className="h-4 w-px bg-gray-100 hidden sm:block" />

        {/* Configuration Group */}
        {renderModeBadge(currentMode)}

        <div className="h-4 w-px bg-gray-100 hidden sm:block" />

        {/* Operation Group */}
        <div className="flex items-center space-x-2">
          {renderProgramBadge(runningPrograms, 0)}
          {renderProgramBadge(runningPrograms, 1)}
        </div>

      </div>
    </div>
  );
};

const renderConnectionBadge = (status: ConnectionStatus, Icon: React.ElementType) => {
  const configs = {
    [ConnectionStatus.Online]: { 
      bgColor: 'bg-green-100', 
      textColor: 'text-green-800', 
      text: "Conectado" 
    },
    [ConnectionStatus.Connecting]: { 
      bgColor: 'bg-yellow-100', 
      textColor: 'text-yellow-800', 
      text: "Conectando..." 
    },
    [ConnectionStatus.Offline]: { 
      bgColor: 'bg-red-100', 
      textColor: 'text-gray-800', 
      text: "Desconectado" 
    },
  };

  const config = configs[status] || configs[ConnectionStatus.Offline];
  
  return (
    <BaseBadge
      text={config.text}
      icon={
        <Icon 
          className={`w-3.5 h-3.5 ${status === ConnectionStatus.Connecting ? 'animate-pulse' : ''}`} 
        />
      }
      bgColor={config.bgColor}
      textColor={config.textColor}
    />
  );
};

const renderModeBadge = (mode: GrillMode | undefined) => {
  if (!mode) {
    return (
      <BaseBadge 
        text="Cargando..." 
        icon={<Loader2 className="h-3.5 w-3.5 animate-spin text-zinc-500" />} 
        bgColor="bg-zinc-100" 
        textColor="text-zinc-800" 
      />
    );
  }

  const isSingle = mode === GrillModes.Single;
  const color = isSingle ? COLORS.SINGLE_MODE : COLORS.DUAL_MODE;
  const text = isSingle ? 'Individual' : 'Dual';
  const IconComponent = isSingle ? ArrowDownUp : ArrowsUpFromLine;

  return (
    <BaseBadge
      text={text}
      icon={<IconComponent className="w-3.5 h-3.5" />}
      bgColor={`bg-${color}-100`}
      textColor={`text-${color}-800`}
    />
  );
};

const renderProgramBadge = (runningPrograms: RunningPrograms, grillIndex: 0 | 1) => {
  const program = runningPrograms[grillIndex];
  const side = grillIndex === 0 ? "I" : "D";

  if (!program || !program.isRunning) {
    return (
      <BaseBadge
        text={`${side}: Manual`}
        icon={<Hand className="w-3.5 h-3.5" />}
        bgColor="bg-zinc-100"
        textColor="text-zinc-500"
      />
    );
  }

  const currentStep = program.currentStepIndex + 1;
  const totalSteps = program.steps.length;

  return (
    <BaseBadge
      text={`${side}: ${program.name} (${currentStep}/${totalSteps})`}
      icon={<Flame className="w-3.5 h-3.5 animate-pulse text-orange-500" />}
      bgColor="bg-orange-100"
      textColor="text-orange-800"
    />
  );
};