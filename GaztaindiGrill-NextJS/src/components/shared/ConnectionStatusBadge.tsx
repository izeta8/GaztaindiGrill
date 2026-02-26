import { ConnectionStatus as ConnectionStatusEnum } from '@/types'
import { BaseBadge } from './BaseBadge'

interface StatusBadgeProps {
  status: ConnectionStatusEnum
  icon: React.ReactNode
}

export function StatusBadge({ status, icon }: StatusBadgeProps) {
  
  const config = {
    [ConnectionStatusEnum.Online]: { 
      bgColor: 'bg-green-100', 
      textColor: 'text-green-800', 
      text: "Conectado" 
    },
    [ConnectionStatusEnum.Connecting]: { 
      bgColor: 'bg-yellow-100', 
      textColor: 'text-yellow-800', 
      text: `Conectando...` 
    },
    [ConnectionStatusEnum.Offline]: { 
      bgColor: 'bg-red-100', 
      textColor: 'text-gray-800', 
      text: "Desconectado" 
    },
  }[status] || { 
    bgColor: 'bg-red-100', 
    textColor: 'text-gray-800', 
    text: "Desconectado" 
  };

  return <BaseBadge {...config} icon={icon} />
}
