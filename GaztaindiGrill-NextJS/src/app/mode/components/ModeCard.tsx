import { cn } from "@/utils"
import type { GrillMode } from '@/types'
import type { ForwardRefExoticComponent, RefAttributes } from 'react'
import type { LucideProps } from 'lucide-react'

// Definimos un mapa de estilos con las clases completas para que Tailwind las detecte
const colorVariants = {
  indigo: {
    border: "border-indigo-500",
    bg: "bg-indigo-50",
    textIcon: "text-indigo-600",
    textTitle: "text-indigo-900",
    textDesc: "text-indigo-700",
    indicator: "bg-indigo-600"
  },
  violet: {
    border: "border-violet-500",
    bg: "bg-violet-50",
    textIcon: "text-violet-600",
    textTitle: "text-violet-900",
    textDesc: "text-violet-700",
    indicator: "bg-violet-600"
  }
}

interface ModeCardProps {
  mode: {
    value: GrillMode
    label: string
    description: string
    icon: ForwardRefExoticComponent<Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>>
    color: "indigo" | "violet"
  }
  isSelected: boolean
  onSelect: (mode: GrillMode) => void
}

export function ModeCard({ mode, isSelected, onSelect }: ModeCardProps) {
  const Icon = mode.icon
  const styles = colorVariants[mode.color]

  return (
    <div
      onClick={() => onSelect(mode.value)}
      className={cn(
        "relative cursor-pointer rounded-lg border-2 p-6 transition-all border-gray-200 hover:border-gray-300",
        isSelected && `${styles.border} ${styles.bg}` 
      )}
    >
      <div className="flex items-center space-x-4">
        <Icon className={cn(
          "h-8 w-8 mt-1",
          isSelected ? styles.textIcon : 'text-gray-400'
        )} />

        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <h3 className={cn(
              "text-xl font-semibold",
              isSelected ? styles.textTitle : 'text-gray-900'
            )}>
              {mode.label}
            </h3>
          </div>

          <p className={cn(
            "text-base",
            isSelected ? styles.textDesc : 'text-gray-600'
          )}>
            {mode.description}
          </p>
        </div>

        <div>
          {isSelected && (
            <div className={cn("w-6 h-6 rounded-full flex items-center justify-center", styles.indicator)}>
              <div className="w-2 h-2 bg-white rounded-full"></div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}