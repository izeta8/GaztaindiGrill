import type { GrillMode } from '@/types'
import type { ForwardRefExoticComponent, RefAttributes } from 'react'
import type { LucideProps } from 'lucide-react'

interface ModeCardProps {
  mode: {
    value: GrillMode
    label: string
    description: string
    icon: ForwardRefExoticComponent<Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>>
    color: string
  }
  isSelected: boolean
  onSelect: (mode: GrillMode) => void
}

export function ModeCard({ mode, isSelected, onSelect }: ModeCardProps) {
  const Icon = mode.icon

  return (

    <div
      onClick={() => onSelect(mode.value)}
      className={`relative cursor-pointer rounded-lg border-2 p-6 transition-all ${
        isSelected
          ? `border-${mode.color}-500 bg-${mode.color}-50`
          : 'border-gray-200 hover:border-gray-300'
      }`}
    >

      <div className="flex items-start space-x-4">
        
        {/* Icon */}
        <Icon className={`h-8 w-8 mt-1 ${
          isSelected ? `text-${mode.color}-600` : 'text-gray-400'
        }`} />

        <div className="flex-1">

          {/* Card title */}
          <div className="flex items-center justify-between mb-2">
            <h3 className={`text-xl font-semibold ${
              isSelected ? `text-${mode.color}-900` : 'text-gray-900'
            }`}>

              {mode.label}
            </h3>

            {isSelected && (
              <div className={`w-6 h-6 rounded-full bg-${mode.color}-600 flex items-center justify-center`}>
                <div className="w-2 h-2 bg-white rounded-full"></div>
              </div>
            )}

          </div>

          {/* Description */}
          <p className={`text-base ${
            isSelected ? `text-${mode.color}-700` : 'text-gray-600'
          }`}>
            {mode.description}
          </p>

        </div>
        
      </div>

    </div>

  )
}