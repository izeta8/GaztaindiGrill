
import { GrillMode, GrillModes } from "@/types"
import { COLORS } from "@/constants"
import { ArrowDownUp, ArrowsUpFromLine, Loader2 } from "lucide-react"
import { BaseBadge } from "./BaseBadge"

interface GrillModeBadgeProps {
  currentMode: GrillMode | undefined
}

export const GrillModeBadge = ({ currentMode }: GrillModeBadgeProps) => {
    
  if (!currentMode) {
    return (
      <BaseBadge 
        text="Cargando..." 
        icon={<Loader2 className="h-4 w-4 animate-spin text-zinc-500" />} 
        bgColor="bg-zinc-200" 
        textColor="text-zinc-800" 
      />
    )
  }

  const isSingle = currentMode === GrillModes.Single
  const color = isSingle ? COLORS.SINGLE_MODE : COLORS.DUAL_MODE
  
  return (
    <BaseBadge
      text={isSingle ? 'Individual' : 'Dual'}
      icon={isSingle ? <ArrowDownUp className="w-4 h-4" /> : <ArrowsUpFromLine className="w-4 h-4" />}
      bgColor={`bg-${color}-100`}
      textColor={`text-${color}-800`}
    />
  )
}
