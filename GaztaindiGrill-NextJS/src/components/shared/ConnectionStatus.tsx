"use client"

import { Smartphone, Heater } from 'lucide-react'
import { ConnectionStatus as ConnectionStatusEnum } from '@/types'
import { StatusBadge } from '@/components/shared/ConnectionStatusBadge'

interface ConnectionStatusProps {
  espConnectionStatus: ConnectionStatusEnum
  clientConnectionStatus: ConnectionStatusEnum
  error?: string | null
}

export function ConnectionStatus({ espConnectionStatus, clientConnectionStatus }: ConnectionStatusProps) {
  
  // Render the two badges side by side.
  return (
    <div className="flex items-center justify-center space-x-2">
      <StatusBadge 
        status={clientConnectionStatus}
        icon={<Smartphone className="w-4 h-4" />}
      />
      <StatusBadge
        status={espConnectionStatus}
        icon={<Heater className="w-4 h-4" />}
      />
    </div>
  )
}