"use client"

import { useMqtt } from './useMqtt'
import { TOPICS } from '@/constants/mqtt'
import { toast } from 'sonner'

export function useSystemActions() {
  const { publish, clientConnectionStatus, espConnectionStatus } = useMqtt()
  const isConnected = clientConnectionStatus === 'online' && espConnectionStatus === 'online'

  const handleSystemReset = async () => {
    if (!isConnected) {
      toast.error('No se puede resetear: Sistema desconectado')
      return false
    }

    try {
      // Send restart command to the global topic
      await publish(`grill/${TOPICS.GLOBAL.RESTART}`, "restart")
      toast.success('Comando de reseteo enviado')
      return true
    } catch (error) {
      console.error('Failed to send reset command:', error)
      toast.error('Error al enviar el comando de reseteo')
      return false
    }
  }

  return {
    handleSystemReset,
    isConnected
  }
}
