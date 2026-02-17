import type { GrillMode } from '@/types'

interface CurrentModeDisplayProps {
  currentMode: GrillMode
}

export function CurrentModeDisplay({ currentMode }: CurrentModeDisplayProps) {
  return (
    <div className="bg-blue-50 rounded-lg p-4 mb-6">
      <div className="flex items-center space-x-3">
        <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
        <div>
          <p className="text-sm font-medium text-blue-900">Modo Actual</p>
          <p className="text-lg font-semibold text-blue-800">
            {currentMode === 'dual' ? 'Dual' : 'Individual'}
          </p>
        </div>
      </div>
    </div>
  )
}
