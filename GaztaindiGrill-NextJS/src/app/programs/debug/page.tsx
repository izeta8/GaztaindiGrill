"use client"

import React from 'react';
// Importamos el hook que creamos en el provider
import { useRunningPrograms } from '@/contexts/RunningProgramsContext';

/**
 * Componente que muestra el estado de UNA SOLA parrilla.
 * Recibe el índice de la parrilla que le interesa.
 */
function GrillStatusCard({ grillIndex }: { grillIndex: number }) {
  
  // 1. Consumimos el hook del provider
  const { getProgramOnGrill } = useRunningPrograms();

  // 2. Pedimos el estado SÓLO para la parrilla que nos interesa
  const grillState = getProgramOnGrill(grillIndex);

  // Ahora, 'grillState' es un objeto: { isLoading, data, error }
  // específico para esta parrilla.

  const renderContent = () => {
    // 3. Comprobamos el estado de ESTA parrilla
    if (grillState.isLoading) {
      return (
        <div className="p-4 bg-yellow-100 rounded-lg">
          <p className="font-semibold text-yellow-800">Cargando datos del programa...</p>
          {/* Incluso mientras carga, podemos mostrar datos MQTT si existen */}
          {grillState.data && (
            <p className="text-sm text-gray-600">
              (Paso {grillState.data.currentStepIndex + 1} de ID: {grillState.data.programId})
            </p>
          )}
        </div>
      );
    }

    if (grillState.error) {
      return (
        <div className="p-4 bg-red-100 rounded-lg">
          <p className="font-semibold text-red-800">Error</p>
          <p className="text-sm text-gray-600">{grillState.error}</p>
        </div>
      );
    }

    if (!grillState.data) {
      return (
        <div className="p-4 bg-gray-100 rounded-lg">
          <p className="font-semibold text-gray-800">Parrilla Libre</p>
          <p className="text-sm text-gray-600">Lista para iniciar un programa.</p>
        </div>
      );
    }

    // Si llegamos aquí, tenemos los datos completos
    return (
      <div className="p-4 bg-green-100 rounded-lg">
        <p className="font-semibold text-green-900">{grillState.data.name}</p>
        <p className="text-sm text-gray-700">
          Paso: {grillState.data.currentStepIndex + 1}
        </p>
        <p className="text-sm text-gray-700">
          Tiempo: {grillState.data.elapsedTime}s
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

  const { runningPrograms } = useRunningPrograms();

  const grill0 = runningPrograms[0];

  console.log("grill0");
  console.log(grill0);


  return (

    <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-gray-50">
        <h1 className="text-3xl font-bold mb-8">Estado de Parrillas</h1>
        <div className="flex flex-col md:flex-row gap-8">
          
          <GrillStatusCard grillIndex={0} />
          <GrillStatusCard grillIndex={1} />
          
        </div>
      </div>
  );
}
