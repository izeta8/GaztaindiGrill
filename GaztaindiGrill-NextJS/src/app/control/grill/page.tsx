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
import { GrillStatusDisplay } from './components/GrillStatusDisplay'
import { ConnectionStatus } from '@/components/shared/ConnectionStatus'
import { ControlPanel } from './components/ControlPanel'
import { ProgramExecutionStatus } from './components/ProgramExecutionStatus'

function GrillControlContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  
  // Get the grill index from query params
  const grillParam = searchParams.get('index')
  const grillIndex = grillParam === '1' ? 1 : 0
  const isLeftGrill = grillIndex === 0
  const grillName = isLeftGrill ? 'Izquierda' : 'Derecha'

  // Redirect if there is no grill index
  useEffect(() => {
    if (!grillParam) {
      router.push('/control')
    }
  }, [grillParam, router])

  // Global states and contexts
  const { espConnectionStatus, clientConnectionStatus, error: connectionError } = useMqtt()
  const { runningPrograms } = useRunningPrograms()
  
  const isConnected = espConnectionStatus === ConnectionStatusEnum.Online && clientConnectionStatus === ConnectionStatusEnum.Online
  const isProgramRunning = !!runningPrograms[grillIndex]

  // Use of custom hooks
  const grillState = useGrillState(grillIndex, isConnected)
  const commands = useGrillCommands(grillIndex, isConnected, grillName, isLeftGrill)

  if (!grillParam) return null; // Avoid render before redirection

  return (
    <div className="min-h-screen bg-gray-50 py-4 px-4">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="text-center mb-4">
            <h1 className="text-2xl font-bold text-gray-900">
              Parrilla {grillName}
            </h1>
            <p className="text-sm text-gray-600">
              Control manual y monitoreo
            </p>
          </div>
          <ConnectionStatus
            espConnectionStatus={espConnectionStatus}
            clientConnectionStatus={clientConnectionStatus}
            error={connectionError}
          />
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