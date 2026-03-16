"use client"

import { Suspense } from 'react'
import { useMqtt } from '@/hooks/useMqtt'
import { ConnectionStatus as ConnectionStatusEnum } from '@/types'
import { useRunningPrograms } from '@/contexts/RunningProgramsContext'
import { useGrillState } from '@/app/control/hooks/useGrillState'
import { useGrillCommands } from '@/app/control/hooks/useGrillCommands'
import { PageHeader } from '@/components/shared/PageHeader'
import { GlobalStatusDock } from '@/components/shared/GlobalStatusDock'
import GrillScene from '@/components/three/GrillScene'
import { ControlColumn } from './components/ControlColumn'
import { ProgramExecutionStatus } from './components/ProgramExecutionStatus'

function GrillControlContent() {
  const { espConnectionStatus, clientConnectionStatus } = useMqtt()
  const { runningPrograms, isAnyProgramRunning } = useRunningPrograms()
  const isConnected = espConnectionStatus === ConnectionStatusEnum.Online && clientConnectionStatus === ConnectionStatusEnum.Online

  const state0 = useGrillState(0)
  const state1 = useGrillState(1)
  
  const commands0 = useGrillCommands(0)
  const commands1 = useGrillCommands(1)

  return (
    <div className="min-h-screen bg-gray-50 py-4 px-2 pb-20 font-sans">
      <div className="max-w-4xl mx-auto">
        <GlobalStatusDock />

        <PageHeader 
          pageTitle="Control de parrillas"
          pageDescription="Monitoreo de sensores y actuadores en tiempo real"
        />

        <GrillScene grillState0={state0} grillState1={state1} />

        {!(!!runningPrograms[0] && !!runningPrograms[1]) && (

          <div className="flex justify-center items-start gap-8 sm:gap-16 mt-6 animate-in fade-in slide-in-from-top-4 duration-500">

            <ControlColumn 
              label="Parrilla I" 
              isConnected={isConnected}
              isRunning={!!runningPrograms[0]}
              commands={commands0}
              grillState={state0}
              grillIndex={0}
            />

            <ControlColumn 
              label="Parrilla D" 
              isConnected={isConnected}
              isRunning={!!runningPrograms[1]}
              commands={commands1}
              grillState={state1}
              grillIndex={1}
            />

          </div>
        )}

        {isAnyProgramRunning() && (
          <ProgramExecutionStatus 
            handleCancelPrograms={[commands0.handleCancelProgram, commands1.handleCancelProgram]} 
            isConnected={isConnected} 
          />
        )}
      </div>
    </div>
  )
}

export default function GrillControlPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center italic text-gray-400">Sincronizando sistemas...</div>}>
      <GrillControlContent />
    </Suspense>
  )
}
