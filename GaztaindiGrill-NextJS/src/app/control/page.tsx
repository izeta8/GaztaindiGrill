"use client"

import { useRouter } from 'next/navigation'
import { ChefHat } from 'lucide-react'
import { useMqtt } from '@/lib/mqtt/useMqtt'
import { Button } from '@/components/ui/Button'
import { ConnectionStatus } from './components/ConnectionStatus'

export default function ControlPage() {
  const router = useRouter()
  const { isConnected } = useMqtt()

  const selectGrill = (index: 0 | 1) => {
    router.push(`/control/grill?index=${index}`)
  }

  return (
    <div className="min-h-screen bg-gray-50 py-4 px-4">
      <div className="max-w-2xl mx-auto">
        
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="text-center mb-4">
            <ChefHat className="h-12 w-12 mx-auto mb-4 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Control de Parrillas
            </h1>
            <p className="text-sm text-gray-600">
              Selecciona la parrilla que deseas controlar
            </p>
          </div>
          
          {/* Connection Status */}
          <ConnectionStatus isConnected={isConnected} />
        </div>

        {/* Quick Access */}
        <div className="mt-8 bg-blue-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-900 mb-2">Acceso Rápido</h3>
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={() => selectGrill(0)}
              variant="secondary"
              size="sm"
              className="text-blue-700 border-blue-200 hover:bg-blue-100"
            >
              Izquierda
            </Button>
            <Button
              onClick={() => selectGrill(1)}
              variant="secondary"
              size="sm"
              className="text-blue-700 border-blue-200 hover:bg-blue-100"
            >
              Derecha
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
