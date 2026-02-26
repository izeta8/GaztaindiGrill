"use client"

import { useState } from 'react'
import { toast } from 'sonner'
import { ArrowsUpFromLine, ArrowDownUp } from 'lucide-react'
import { useMqtt } from '@/hooks/useMqtt'
import { ConnectionStatus } from '@/components/shared/ConnectionStatus'
import { ModeCard } from './components/ModeCard'
import { CurrentModeDisplay } from './components/CurrentModeDisplay'
import { ModeApplyButton } from './components/ModeApplyButton'
import type { GrillMode } from '@/types'
import { TOPICS } from '@/constants/mqtt'
import { ConnectionStatus as ConnectionStatusEnum, GrillModes } from '@/types'
import { useRunningPrograms } from '@/contexts/RunningProgramsContext'
import { useCurrentMode } from '@/contexts/CurrentModeContext'

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
      color: 'emerald'
    },
    {
      value: 'dual' as GrillMode,
      label: 'Dual',
      description: 'Ambas parrillas sincronizadas',
      icon: ArrowsUpFromLine,
      color: 'amber'
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
      const modeLabel = selectedMode === 'dual' ? 'dual' : 'independiente'
      toast.success(`Se ha solicitado cambiar a modo ${modeLabel}.`)
      await publish(`grill/${TOPICS.MODE.REQUEST_MODE_CHANGE}`, selectedMode, { qos: 1 })

    } catch (error) {
      toast.error('Error al cambiar modo')
      console.error('Mode change error:', error)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-4 px-4">
      <div className="max-w-2xl mx-auto">
        
        {/* Header */}
        <Header
          clientConnectionStatus={clientConnectionStatus}
          espConnectionStatus={espConnectionStatus}
        />

        <CurrentModeDisplay currentMode={currentMode} />

        {currentMode !== undefined && ( 
        <>
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

interface HeaderProps {
  espConnectionStatus: ConnectionStatusEnum;
  clientConnectionStatus: ConnectionStatusEnum;
}

const Header = ({espConnectionStatus, clientConnectionStatus}: HeaderProps) => {

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="text-center mb-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Modo de Funcionamiento
          </h1>
          <p className="text-sm text-gray-600">
            Selecciona cómo quieres que funcionen las parrillas
          </p>
        </div>
        
        {/* Connection Status */}
        <ConnectionStatus 
          espConnectionStatus={espConnectionStatus}
          clientConnectionStatus={clientConnectionStatus}
        />
      </div>
  )

}