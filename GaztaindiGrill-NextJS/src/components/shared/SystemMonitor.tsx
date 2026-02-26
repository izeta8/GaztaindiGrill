

"use client";

import React from "react";
import { useMqtt } from "@/hooks/useMqtt";
import { ConnectionStatus } from "./ConnectionStatus";
import { useCurrentMode } from "@/contexts/CurrentModeContext";
import { GrillModeBadge } from "./GrillModeBadge";


interface SystemMonitorProps {
  pageTitle: string;
  pageDescription: string;
}

export const SystemMonitor = ({pageTitle, pageDescription}: SystemMonitorProps) => {

  const { espConnectionStatus, clientConnectionStatus } = useMqtt();
  const { currentMode} = useCurrentMode();

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

      <div className={`flex items-center justify-evenly space-x-2 px-3 py-1 rounded-full text-sm`}>
        
        {/* Connectivity badges */}
        <ConnectionStatus
          espConnectionStatus={espConnectionStatus}
          clientConnectionStatus={clientConnectionStatus}
        />

        {/* Grill mode badge */}
        <GrillModeBadge
          currentMode={currentMode}
        />

        </div>
    </div>
  );
};