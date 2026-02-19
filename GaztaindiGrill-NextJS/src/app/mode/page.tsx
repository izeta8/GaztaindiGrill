"use client"

import { useState } from 'react'
import { toast } from 'sonner'
import { Settings, Users } from 'lucide-react'
import { useMqtt } from '@/hooks/useMqtt'
import { ConnectionStatus } from '@/components/shared/ConnectionStatus'
import { ModeCard } from './components/ModeCard'
import { CurrentModeDisplay } from './components/CurrentModeDisplay'
import { ModeApplyButton } from './components/ModeApplyButton'
import type { GrillModeType } from '@/types'
import { TOPICS } from '@/constants/mqtt'
import { ConnectionStatus as ConnectionStatusEnum } from '@/types'

export default function ModePage() {
  const { publish, espConnectionStatus, clientConnectionStatus } = useMqtt()
  const [currentMode, setCurrentMode] = useState<GrillModeType>('normal')
  const [selectedMode, setSelectedMode] = useState<GrillModeType>('normal')
  const [isExecuting, setIsExecuting] = useState(false)
  const isConnected = espConnectionStatus !== ConnectionStatusEnum.Online || clientConnectionStatus !== ConnectionStatusEnum.Online;

  const modes = [
    {
      value: 'normal' as GrillModeType,
      label: 'Independiente',
      description: 'Funcionamiento independiente de cada parrilla',
      icon: Settings,
      color: 'blue'
    },
    {
      value: 'dual' as GrillModeType,
      label: 'Dual',
      description: 'Ambas parrillas sincronizadas',
      icon: Users,
      color: 'green'
    }
  ]

  const handleModeChange = async () => {
    if (isConnected) {
      toast.error('MQTT no conectado')
      return
    }

    try {
      setIsExecuting(true)
      // Send mode to both grills
      await publish(`grill/0/${TOPICS.ACTION.SYSTEM.SET_MODE}`, selectedMode, { qos: 1 })
      await publish(`grill/1/${TOPICS.ACTION.SYSTEM.SET_MODE}`, selectedMode, { qos: 1 })
      setCurrentMode(selectedMode)
      
      const modeLabel = selectedMode === 'dual' ? 'Dual' : 'Independiente'
      toast.success(`Modo ${modeLabel} establecido correctamente`)
    } catch (error) {
      toast.error('Error al cambiar modo')
      console.error('Mode change error:', error)
    } finally {
      setIsExecuting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-4 px-4">
      <div className="max-w-2xl mx-auto">
        
        {/* Header */}
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

        {/* Current Mode Display */}
        <CurrentModeDisplay currentMode={currentMode} />

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
          onApply={handleModeChange}
          isConnected={isConnected}
          isExecuting={isExecuting}
        />
      </div>
    </div>
  )
}
