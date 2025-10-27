
import { ConnectionStatus as ConnectionStatusEnum } from '@/lib/types'


interface StatusBadgeProps {
  status: ConnectionStatusEnum
  icon: React.ReactNode
}

export function StatusBadge({ status, icon }: StatusBadgeProps) {
  
  let bgColor = 'bg-red-100'
  let textColor = 'text-gray-800'
  let text = "Desconectado"

  switch (status) {
    case ConnectionStatusEnum.Connected:
      bgColor = 'bg-green-100'
      textColor = 'text-green-800'
      text = "Conectado"
      break
    case ConnectionStatusEnum.Connecting:
      bgColor = 'bg-yellow-100'
      textColor = 'text-yellow-800'
      text = `Conectando...`
      break
    case ConnectionStatusEnum.Offline:
      break
  }

  return (
    <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${bgColor} ${textColor}`}>
      {icon}
      <span>{text}</span>
    </div>
  )
}