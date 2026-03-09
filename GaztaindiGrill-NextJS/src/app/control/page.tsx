"use client"

import { Suspense, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useMqtt } from '@/hooks/useMqtt'
import { ConnectionStatus as ConnectionStatusEnum } from '@/types'
import { useRunningPrograms } from '@/contexts/RunningProgramsContext'

// Custom hooks
import { useGrillState } from '@/app/control/grill/hooks/useGrillState'
import { useGrillCommands } from '@/app/control/grill/hooks/useGrillCommands'

// UI Components
import { GrillStatusDisplay } from './grill/components/GrillStatusDisplay'
import { ControlPanel } from './grill/components/ControlPanel'
import { ProgramExecutionStatus } from './grill/components/ProgramExecutionStatus'
import { SystemMonitor } from '@/components/shared/SystemMonitor'
import dynamic from 'next/dynamic'

// Importar el componente 3D de forma dinámica (solo cliente)
const GrillScene = dynamic(() => import('@/components/three/GrillScene'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[400px] bg-white rounded-xl shadow-inner border border-gray-100 flex items-center justify-center animate-pulse">
      <div className="text-gray-400">Preparando escena 3D...</div>
    </div>
  ),
})

function GrillControlContent() {
  const router = useRouter()
  
  // Global states and contexts
  const { espConnectionStatus, clientConnectionStatus } = useMqtt()
  const { runningPrograms } = useRunningPrograms()
  
  const isConnected = espConnectionStatus === ConnectionStatusEnum.Online && clientConnectionStatus === ConnectionStatusEnum.Online
  const isProgramRunning = true // !!runningPrograms[grillIndex]

  // Use of custom hooks
  const grillIndex = 0 // !! manejau biyak
  const grillName = "" // !! manejau biyak
  const isLeftGrill = true; // !! manejau biyak
  const grillState = useGrillState(grillIndex, isConnected)
  const commands = useGrillCommands(grillIndex, isConnected, grillName, isLeftGrill)

  return (
    <div className="min-h-screen bg-gray-50 py-4 px-4">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <SystemMonitor 
          pageTitle={`Parrilla ${grillName}`}
          pageDescription='Control manual y monitoreo'
        />

        {/* 3D Model View */}
        <div className="mb-6">
          <GrillScene grillState={grillState} />
        </div>

        {/* Grill Status Display */}
        <div className="mb-6">
          <GrillStatusDisplay
            title={`Estado Actual`}
            grillState={grillState}
            showRotation={isLeftGrill}
          />
        </div>

        {/* Control Panel vs Program Execution */}
        {!isProgramRunning ? (
          <ControlPanel
            grillName={grillName}
            isConnected={isConnected}
            isProgramRunning={isProgramRunning}
            isLeftGrill={isLeftGrill}
            onDirectionCommand={commands.handleDirectionCommand}
            onRotationCommand={commands.handleRotationCommand}
            onSetPosition={commands.handleSetPosition}
            onSetTemperature={commands.handleSetTemperature}
            onSetRotation={commands.handleSetRotation}
          />
        ) : (
          <ProgramExecutionStatus
            handleCancelProgram={commands.handleCancelProgram}
            isConnected={isConnected}
            grillIndex={grillIndex}
          />
        )}

      </div>
    </div>
  )
}

// Default export wrapper
export default function GrillControlPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 py-4 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Cargando control de parrilla...</p>
            </div>
          </div>
        </div>
      </div>
    }>
      <GrillControlContent />
    </Suspense>
  )
}