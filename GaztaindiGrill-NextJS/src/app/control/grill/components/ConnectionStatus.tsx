"use client"

import { AlertCircle, Cpu, Heater } from 'lucide-react'
import { ConnectionStatus as ConnectionStatusEnum } from '@/lib/types'
import { StatusBadge } from './ConnectionStatusBadge'

interface ConnectionStatusProps {
  espConnectionStatus: ConnectionStatusEnum
  clientConnectionStatus: ConnectionStatusEnum
  error?: string | null
}

export function ConnectionStatus({ espConnectionStatus, clientConnectionStatus, error }: ConnectionStatusProps) {
  
  // For now we dont want to do anything with the errors.
  // If there is a general error, show it with priority over the other statuses.
  // if (error) {
  //   return (
  //     <div className="flex items-center justify-center">
  //       <div className="flex items-center space-x-2 px-3 py-1 rounded-full text-sm bg-red-100 text-red-800">
  //         <AlertCircle className="w-4 h-4" />
  //         <span>Error de conexión: {error}</span>
  //       </div>
  //     </div>
  //   )
  // }

  // Render the two badges side by side.
  return (
    <div className="flex items-center justify-center space-x-2">
      <StatusBadge 
        status={clientConnectionStatus}
        icon={<Cpu className="w-4 h-4" />}
      />
      <StatusBadge
        status={espConnectionStatus}
        icon={<Heater className="w-4 h-4" />}
      />
    </div>
  )
}