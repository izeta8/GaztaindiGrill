import type { GrillMode } from '@/types'
import { Loader2 } from 'lucide-react'

interface CurrentModeDisplayProps {
  currentMode: GrillMode | undefined
}

export function CurrentModeDisplay({ currentMode }: CurrentModeDisplayProps) {
  return (
    <div className="bg-blue-100 border-blue-300 border-1 rounded-lg p-4">
      <div className="flex items-center space-x-3">
        <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
        <div>
          <p className="text-sm font-medium text-blue-900">Modo Actual</p>

          {currentMode === undefined ?
            <div className="flex items-center space-x-2">
              <Loader2 className="h-6 w-6 text-blue-500 animate-spin" />
              <p className="text-lg font-semibold text-blue-500">Cargando...</p>
            </div>
            :
            <p className="text-lg font-semibold text-blue-800">
              {currentMode === 'dual' ? 'Dual' : 'Individual'}
            </p>
          }
        </div>
      </div>
    </div>
  )
}
