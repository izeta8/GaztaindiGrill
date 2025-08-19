"use client"

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ChevronUp, ChevronDown, RotateCcw, RotateCw, Square, Pause } from 'lucide-react'
import { useMqtt } from '@/lib/mqtt/useMqtt'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { GrillStatusDisplay } from '../components/GrillStatusDisplay'
import { ModeSelector } from '../components/ModeSelector'
import { ConnectionStatus } from '../components/ConnectionStatus'
import type { GrillState, GrillMode, GrillDirection, GrillRotation } from '@/lib/types'

export default function GrillControlPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { publish, subscribe, isConnected } = useMqtt()
  
  // Get grill index from query params
  const grillParam = searchParams.get('index')
  const grillIndex = grillParam === '1' ? 1 : 0
  const isLeftGrill = grillIndex === 0
  const grillName = isLeftGrill ? 'Izquierda' : 'Derecha'
  
  const [grillState, setGrillState] = useState<GrillState>({
    position: 0,
    temperature: 0,
    rotation: 0,
    isConnected: false,
    lastUpdate: null
  })
  
  const [currentMode, setCurrentMode] = useState<GrillMode>('normal')
  const [targetPosition, setTargetPosition] = useState('')
  const [targetTemperature, setTargetTemperature] = useState('')
  const [targetRotation, setTargetRotation] = useState('')
  const [isExecuting, setIsExecuting] = useState(false)

  // Subscribe to current grill status updates
  useEffect(() => {
    // Redirect if no grill specified
    if (!grillParam) {
      router.push('/control')
      return
    }
    if (!isConnected) return

    const subscriptions: (() => void)[] = []

    const setupSubscriptions = async () => {
      try {
        const unsubPos = await subscribe(`grill/${grillIndex}/posicion`, (topic, payload) => {
          const position = parseInt(payload.toString())
          if (!isNaN(position)) {
            setGrillState(prev => ({ ...prev, position, isConnected: true, lastUpdate: new Date() }))
          }
        })
        subscriptions.push(unsubPos)

        const unsubTemp = await subscribe(`grill/${grillIndex}/temperatura`, (topic, payload) => {
          const temperature = parseInt(payload.toString())
          if (!isNaN(temperature)) {
            setGrillState(prev => ({ ...prev, temperature, isConnected: true, lastUpdate: new Date() }))
          }
        })
        subscriptions.push(unsubTemp)

        const unsubRot = await subscribe(`grill/${grillIndex}/inclinacion`, (topic, payload) => {
          const rotation = parseInt(payload.toString())
          if (!isNaN(rotation)) {
            setGrillState(prev => ({ ...prev, rotation, isConnected: true, lastUpdate: new Date() }))
          }
        })
        subscriptions.push(unsubRot)

      } catch (error) {
        toast.error('Error al suscribirse a actualizaciones de estado')
        console.error('MQTT subscription error:', error)
      }
    }

    setupSubscriptions()

    return () => {
      subscriptions.forEach(unsub => unsub())
    }
  }, [isConnected, subscribe, grillIndex])

  const sendCommand = async (topic: string, payload: string) => {
    if (!isConnected) {
      toast.error('MQTT no conectado')
      return
    }

    try {
      setIsExecuting(true)
      const fullTopic = `grill/${grillIndex}/${topic}`
      await publish(fullTopic, payload, { qos: 1 })
      toast.success(`Comando enviado a parrilla ${grillName.toLowerCase()}`)
    } catch (error) {
      toast.error('Error al enviar comando')
      console.error('MQTT publish error:', error)
    } finally {
      setIsExecuting(false)
    }
  }

  const handleDirectionCommand = (direction: GrillDirection) => {
    sendCommand('dirigir', direction)
  }

  const handleRotationCommand = (rotation: GrillRotation) => {
    if (!isLeftGrill) return
    sendCommand('inclinar', rotation)
  }

  const handleSetPosition = () => {
    const pos = parseInt(targetPosition)
    if (isNaN(pos) || pos < 0 || pos > 100) {
      toast.error('Posición debe estar entre 0 y 100')
      return
    }
    sendCommand('establecer_posicion', targetPosition)
    setTargetPosition('')
  }

  const handleSetTemperature = () => {
    const temp = parseInt(targetTemperature)
    if (isNaN(temp) || temp < 0 || temp > 500) {
      toast.error('Temperatura debe estar entre 0 y 500°C')
      return
    }
    sendCommand('establecer_temperatura', targetTemperature)
    setTargetTemperature('')
  }

  const handleSetRotation = () => {
    if (!isLeftGrill) return
    const rot = parseInt(targetRotation)
    if (isNaN(rot) || rot < 0 || rot > 360) {
      toast.error('Rotación debe estar entre 0 y 360°')
      return
    }
    sendCommand('establecer_inclinacion', targetRotation)
    setTargetRotation('')
  }

  const handleCancelProgram = () => {
    if (confirm(`¿Estás seguro de cancelar el programa en la parrilla ${grillName.toLowerCase()}?`)) {
      sendCommand('cancelar_programa', '')
    }
  }

  const handleModeChange = async (mode: GrillMode) => {
    try {
      const topic = `grill/${grillIndex}/establecer_modo`
      await publish(topic, mode, { qos: 1 })
      setCurrentMode(mode)
    } catch (error) {
      toast.error('Error al cambiar modo')
      throw error
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-4 px-4">
      <div className="max-w-2xl mx-auto">
        
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                   
          <div className="text-center mb-4">
            <h1 className="text-2xl font-bold text-gray-900">
              Parrilla {grillName}
            </h1>
            <p className="text-sm text-gray-600">
              Control manual y monitoreo
            </p>
          </div>
          
          {/* Connection Status */}
          <ConnectionStatus isConnected={isConnected} />
        </div>

        {/* Grill Status */}
        <div className="mb-6">
          <GrillStatusDisplay 
            title={`Estado Actual`}
            grillState={grillState}
            showRotation={isLeftGrill}
          />
        </div>

        {/* Control Panel */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Control Parrilla {grillName}
          </h3>

          {/* Direction Controls */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Dirección</h4>
            <div className="grid grid-cols-3 gap-2">
              <Button
                onClick={() => handleDirectionCommand('subir')}
                disabled={!isConnected || isExecuting}
                variant="primary"
                className="flex flex-col items-center py-4"
              >
                <ChevronUp className="h-5 w-5 mb-1" />
                <span className="text-xs">Subir</span>
              </Button>
              <Button
                onClick={() => handleDirectionCommand('parar')}
                disabled={!isConnected || isExecuting}
                variant="secondary"
                className="flex flex-col items-center py-4"
              >
                <Square className="h-5 w-5 mb-1" />
                <span className="text-xs">Parar</span>
              </Button>
              <Button
                onClick={() => handleDirectionCommand('bajar')}
                disabled={!isConnected || isExecuting}
                variant="primary"
                className="flex flex-col items-center py-4"
              >
                <ChevronDown className="h-5 w-5 mb-1" />
                <span className="text-xs">Bajar</span>
              </Button>
            </div>
          </div>

          {/* Position Control */}
          <div className="mb-6">
            <div className="flex items-center space-x-2 mb-2">
              <Input
                label="Posición (%)"
                type="number"
                value={targetPosition}
                onChange={setTargetPosition}
                placeholder="0-100"
                min={0}
                max={100}
              />
              <Button
                onClick={handleSetPosition}
                disabled={!isConnected || isExecuting || !targetPosition}
                variant="primary"
                className="mt-6"
              >
                Ir
              </Button>
            </div>
          </div>

          {/* Temperature Control */}
          <div className="mb-6">
            <div className="flex items-center space-x-2 mb-2">
              <Input
                label="Temperatura (°C)"
                type="number"
                value={targetTemperature}
                onChange={setTargetTemperature}
                placeholder="0-500"
                min={0}
                max={500}
              />
              <Button
                onClick={handleSetTemperature}
                disabled={!isConnected || isExecuting || !targetTemperature}
                variant="primary"
                className="mt-6"
              >
                Ir
              </Button>
            </div>
          </div>

          {/* Rotation Controls (only for left grill) */}
          {isLeftGrill && (
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Rotación</h4>
              <div className="grid grid-cols-3 gap-2 mb-3">
                <Button
                  onClick={() => handleRotationCommand('antihorario')}
                  disabled={!isConnected || isExecuting}
                  variant="primary"
                  className="flex flex-col items-center py-4"
                >
                  <RotateCcw className="h-5 w-5 mb-1" />
                  <span className="text-xs">Anti-horario</span>
                </Button>
                <Button
                  onClick={() => handleRotationCommand('parar')}
                  disabled={!isConnected || isExecuting}
                  variant="secondary"
                  className="flex flex-col items-center py-4"
                >
                  <Square className="h-5 w-5 mb-1" />
                  <span className="text-xs">Parar</span>
                </Button>
                <Button
                  onClick={() => handleRotationCommand('horario')}
                  disabled={!isConnected || isExecuting}
                  variant="primary"
                  className="flex flex-col items-center py-4"
                >
                  <RotateCw className="h-5 w-5 mb-1" />
                  <span className="text-xs">Horario</span>
                </Button>
              </div>
              
              {/* Set specific rotation */}
              <div className="flex items-center space-x-2">
                <Input
                  label="Grados (0-360)"
                  type="number"
                  value={targetRotation}
                  onChange={setTargetRotation}
                  placeholder="0-360"
                  min={0}
                  max={360}
                />
                <Button
                  onClick={handleSetRotation}
                  disabled={!isConnected || isExecuting || !targetRotation}
                  variant="primary"
                  className="mt-6"
                >
                  Ir
                </Button>
              </div>
            </div>
          )}

          {/* System Controls */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Sistema</h4>
            <div className="grid grid-cols-1 gap-2">
              <Button
                onClick={handleCancelProgram}
                disabled={!isConnected || isExecuting}
                variant="danger"
                size="sm"
              >
                <Pause className="h-4 w-4 mr-1" />
                Cancelar Programa
              </Button>
            </div>
          </div>
        </div>

        {/* Mode Selector - Only Normal/Spinning */}
        <div className="mb-6">
          <ModeSelector 
            currentMode={currentMode}
            onModeChange={handleModeChange}
            isConnected={isConnected}
            isExecuting={false}
            showDualMode={false}
          />
        </div>
      </div>
    </div>
  )
}
