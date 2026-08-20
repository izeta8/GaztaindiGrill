"use client"

import { useMqtt } from './useMqtt'
import { TOPICS } from '@/constants/mqtt'
import { toast } from 'sonner'

export function useSystemActions() {
  const { sendCommand, clientConnectionStatus, espConnectionStatus } = useMqtt()
  const isConnected = clientConnectionStatus === 'online' && espConnectionStatus === 'online'

  const handleSystemReset = async () => {
    if (!isConnected) {
      toast.error('No se puede resetear: Sistema desconectado')
      return false
    }

    try {
      // Send restart command to the global topic
      await sendCommand(`grill/${TOPICS.GLOBAL.RESTART}`, "restart")
      toast.success('Comando de reseteo enviado')
      return true
    } catch (error) {
      console.error('Failed to send reset command:', error)
      toast.error('Error al enviar el comando de reseteo')
      return false
    }
  }

  const handleEmergencyStop = async () => {
    if (!isConnected) {
      toast.error('No se puede detener: Sistema desconectado')
      return false
    }

    try {
      // Send emergency stop command to the global topic
      await sendCommand(`grill/${TOPICS.GLOBAL.EMERGENCY_STOP}`, "stop")
      toast.success('PARADA DE EMERGENCIA ENVIADA')
      return true
    } catch (error) {
      console.error('Failed to send emergency stop command:', error)
      toast.error('Error al enviar parada de emergencia')
      return false
    }
  }

  return {
    handleSystemReset,
    handleEmergencyStop,
    isConnected
  }
}
