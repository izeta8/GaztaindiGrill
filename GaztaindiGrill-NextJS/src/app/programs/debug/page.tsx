"use client"

import React from 'react';
import { useRunningPrograms } from '@/contexts/RunningProgramsContext';
import { GlobalStatusDock } from '@/components/shared/GlobalStatusDock';

function GrillStatusCard({ grillIndex }: { grillIndex: number }) {
  
  const { runningPrograms } = useRunningPrograms();
  const grillState = runningPrograms[0];

  const renderContent = () => {
  
    if (!grillState) {
      return (
        <div className="p-4 bg-gray-100 rounded-lg">
          <p className="font-semibold text-gray-800">Parrilla Libre</p>
          <p className="text-sm text-gray-600">Lista para iniciar un programa.</p>
        </div>
      );
    }

    return (
      <div className="p-4 bg-green-100 rounded-lg">
        <p className="font-semibold text-green-900">{grillState.name}</p>
        <p className="text-sm text-gray-700">
          Paso: {grillState.currentStepIndex + 1}
        </p>
        <p className="text-sm text-gray-700">
          Tiempo: {grillState.elapsedTime}s
        </p>
      </div>
    );
  };

  return (
    <div className="w-full max-w-sm p-4 bg-white border border-gray-200 rounded-xl shadow-md">
      <h2 className="text-lg font-bold mb-3">Parrilla {grillIndex}</h2>
      {renderContent()}
    </div>
  );
}

export default function GrillDashboard() {

  return (

    <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-gray-50">
        
        {/* Status Bar */}
        <GlobalStatusDock />

        <h1 className="text-3xl font-bold mb-8">Estado de Parrillas</h1>
        <div className="flex flex-col md:flex-row gap-8">
          
          <GrillStatusCard grillIndex={0} />
          <GrillStatusCard grillIndex={1} />
          
        </div>
      </div>
  );
}
