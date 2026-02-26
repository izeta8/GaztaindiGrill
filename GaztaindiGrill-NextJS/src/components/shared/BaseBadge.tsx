
import React from 'react'

interface BaseBadgeProps {
  text: string
  icon: React.ReactNode
  bgColor: string
  textColor: string
}

export function BaseBadge({ text, icon, bgColor, textColor }: BaseBadgeProps) {
  return (
    <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${bgColor} ${textColor}`}>
      {icon}
      <span>{text}</span>
    </div>
  )
}
