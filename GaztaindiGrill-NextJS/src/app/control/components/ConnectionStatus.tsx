"use client"

import { Wifi, WifiOff, AlertCircle } from 'lucide-react'

interface ConnectionStatusProps {
  isConnected: boolean
  isConnecting?: boolean
  error?: string | null
}

export function ConnectionStatus({ isConnected, isConnecting = false, error }: ConnectionStatusProps) {
  if (error) {
    return (
      <div className="flex items-center justify-center">
        <div className="flex items-center space-x-2 px-3 py-1 rounded-full text-sm bg-red-100 text-red-800">
          <AlertCircle className="w-4 h-4" />
          <span>Error de conexión</span>
        </div>
      </div>
    )
  }

  if (isConnecting) {
    return (
      <div className="flex items-center justify-center">
        <div className="flex items-center space-x-2 px-3 py-1 rounded-full text-sm bg-yellow-100 text-yellow-800">
          <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
          <span>Conectando...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center">
      <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${
        isConnected 
          ? 'bg-green-100 text-green-800' 
          : 'bg-red-100 text-red-800'
      }`}>
        {isConnected ? (
          <Wifi className="w-4 h-4" />
        ) : (
          <WifiOff className="w-4 h-4" />
        )}
        <span>{isConnected ? 'Conectado' : 'Desconectado'}</span>
      </div>
    </div>
  )
}
