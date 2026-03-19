"use client"

import { useState } from 'react'
import { toast } from 'sonner'
import { ArrowsUpFromLine, ArrowDownUp } from 'lucide-react'
import { useMqtt } from '@/hooks/useMqtt'
import { ModeCard } from './components/ModeCard'
import { CurrentModeDisplay } from './components/CurrentModeDisplay'
import { ModeApplyButton } from './components/ModeApplyButton'
import type { GrillMode } from '@/types'
import { TOPICS } from '@/constants/mqtt'
import { ConnectionStatus as ConnectionStatusEnum, GrillModes } from '@/types'
import { useRunningPrograms } from '@/contexts/RunningProgramsContext'
import { useCurrentMode } from '@/contexts/CurrentModeContext'
import { PageHeader } from '@/components/shared/PageHeader'
import { COLORS } from '@/constants'
import { GlobalStatusDock } from '@/components/shared/GlobalStatusDock'

export default function ModePage() {

  const { publish, espConnectionStatus, clientConnectionStatus } = useMqtt()
  const { isAnyProgramRunning } = useRunningPrograms();
  const { currentMode } = useCurrentMode();

  const [selectedMode, setSelectedMode] = useState<GrillMode>(GrillModes.Single)
  const isTrulyConnected = espConnectionStatus === ConnectionStatusEnum.Online && clientConnectionStatus === ConnectionStatusEnum.Online;

  const modes = [
    {
      value: 'single' as GrillMode,
      label: 'Independiente',
      description: 'Funcionamiento independiente de cada parrilla',
      icon: ArrowDownUp,
      color: COLORS.SINGLE_MODE
    },
    {
      value: 'dual' as GrillMode,
      label: 'Dual',
      description: 'Ambas parrillas sincronizadas',
      icon: ArrowsUpFromLine,
      color: COLORS.DUAL_MODE
    }
  ]

  const handleModeChange = async (selectedMode: GrillMode) => {

    if (!isTrulyConnected) {
      toast.error('El móvil o la parrilla no está conectada al sistema domótico.')
      return
    }

    if (isAnyProgramRunning()) {
      toast.warning('No se puede cambiar de modo si algun programa se está ejecutando')
      return
    }

    try {
      await publish(`grill/${TOPICS.MODE.REQUEST_MODE_CHANGE}`, selectedMode, { qos: 1 })
    } catch (error) {
      toast.error('Error al cambiar modo')
      console.error('Mode change error:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-4 px-4">
      <div className="max-w-2xl mx-auto">

        {/* Status Bar */}
        <GlobalStatusDock />

        {/* Header */}
        <PageHeader
          pageTitle='Modo de Funcionamiento'
          pageDescription='Selecciona cómo quieres que funcionen las parrillas'
        /> 

        <CurrentModeDisplay currentMode={currentMode} />

        {currentMode !== undefined && (
          <>
    
            <hr className='bg-zinc-400 my-6' />

            {/* Mode Selection */}
            <div className="space-y-4 mb-6">
              {modes.map((mode) => (
                <ModeCard
                  key={mode.value}
                  mode={mode}
                  isSelected={selectedMode === mode.value}
                  onSelect={setSelectedMode}
                />
              ))}
            </div>

            {/* Apply Button */}
            <ModeApplyButton
              onApply={() => handleModeChange(selectedMode)}
              isConnected={isTrulyConnected}
            />
          </>
        )}

      </div>
    </div>
  )
}