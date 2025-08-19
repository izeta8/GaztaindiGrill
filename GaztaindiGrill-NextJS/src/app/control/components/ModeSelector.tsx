"use client"

import { useState } from 'react'
import { toast } from 'sonner'
import { Settings, Zap, Users } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type { GrillMode } from '@/lib/types'

interface ModeSelectorProps {
  currentMode: GrillMode
  onModeChange: (mode: GrillMode) => Promise<void>
  isConnected: boolean
  isExecuting: boolean
  showDualMode?: boolean
}

export function ModeSelector({ currentMode, onModeChange, isConnected, isExecuting, showDualMode = true }: ModeSelectorProps) {
  const [selectedMode, setSelectedMode] = useState<GrillMode>(currentMode)

  const allModes = [
    {
      value: 'normal' as GrillMode,
      label: 'Normal',
      description: 'Funcionamiento estándar',
      icon: Settings,
      color: 'blue'
    },
    {
      value: 'burruntzi' as GrillMode,
      label: 'Spinning',
      description: 'Rotación continua',
      icon: Zap,
      color: 'purple'
    },
    {
      value: 'dual' as GrillMode,
      label: 'Dual',
      description: 'Sincronización entre parrillas',
      icon: Users,
      color: 'green'
    }
  ]

  const modes = showDualMode ? allModes : allModes.filter(mode => mode.value !== 'dual')

  const handleApplyMode = async () => {
    try {
      await onModeChange(selectedMode)
      toast.success(`Modo cambiado a ${modes.find(m => m.value === selectedMode)?.label}`)
    } catch {
      toast.error('Error al cambiar modo')
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Modo de Funcionamiento</h3>
      
      <div className="space-y-3 mb-4">
        {modes.map((mode) => {
          const Icon = mode.icon
          const isSelected = selectedMode === mode.value
          const isCurrent = currentMode === mode.value
          
          return (
            <div
              key={mode.value}
              onClick={() => setSelectedMode(mode.value)}
              className={`relative cursor-pointer rounded-lg border-2 p-4 transition-all ${
                isSelected
                  ? `border-${mode.color}-500 bg-${mode.color}-50`
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon className={`h-5 w-5 ${
                  isSelected ? `text-${mode.color}-600` : 'text-gray-400'
                }`} />
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <span className={`font-medium ${
                      isSelected ? `text-${mode.color}-900` : 'text-gray-900'
                    }`}>
                      {mode.label}
                    </span>
                    {isCurrent && (
                      <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                        Activo
                      </span>
                    )}
                  </div>
                  <p className={`text-sm ${
                    isSelected ? `text-${mode.color}-700` : 'text-gray-500'
                  }`}>
                    {mode.description}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <Button
        onClick={handleApplyMode}
        disabled={!isConnected || isExecuting || selectedMode === currentMode}
        variant="primary"
        className="w-full"
      >
        Aplicar Modo
      </Button>
    </div>
  )
}
