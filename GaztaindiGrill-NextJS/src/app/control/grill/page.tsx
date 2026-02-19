"use client"

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useMqtt } from '@/hooks/useMqtt'
import { GrillStatusDisplay } from './components/GrillStatusDisplay'
import type { GrillState, GrillDirection, GrillRotation } from '@/types'
import { TOPICS } from '@/constants/mqtt'
import { ConnectionStatus } from '@/components/shared/ConnectionStatus'
import { ConnectionStatus as ConnectionStatusEnum } from '@/types'
import { ControlPanel } from './components/ControlPanel'
import { ProgramExecutionStatus } from './components/ProgramExecutionStatus'
import { useRunningPrograms } from '@/contexts/RunningProgramsContext'

function GrillControlContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { publish, subscribe, espConnectionStatus, clientConnectionStatus, error: connectionError } = useMqtt()
  const { runningPrograms } = useRunningPrograms();

  // Get grill index from query params
  const grillParam = searchParams.get('index')
  const grillIndex = grillParam === '1' ? 1 : 0
  const isLeftGrill = grillIndex === 0
  const grillName = isLeftGrill ? 'Izquierda' : 'Derecha'

  // Get program state for this specific grill
  const programData = runningPrograms[grillIndex];
  const isProgramRunning = !!programData;

  const [grillState, setGrillState] = useState<GrillState>({
    position: 0,
    temperature: 0,
    rotation: 0,
    lastUpdate: null
  })

  const [targetPosition, setTargetPosition] = useState('')
  const [targetTemperature, setTargetTemperature] = useState('')
  const [targetRotation, setTargetRotation] = useState('')
  
  const isConnected = espConnectionStatus === ConnectionStatusEnum.Online && clientConnectionStatus === ConnectionStatusEnum.Online;

  // Subscribe ONLY to local grill status updates (position, temp, tilt)
  useEffect(() => {
    // Redirect if no grill specified
    if (!grillParam) {
      router.push('/control')
      return
    }
    // Only subscribe if connected
    if (!isConnected) return

    const subscriptions: (() => void)[] = []

    const setupSubscriptions = async () => {
      try {
        // Subscribe to position updates
        const unsubPos = await subscribe(`grill/${grillIndex}/${TOPICS.STATUS.SENSOR.POSITION}`, (topic, payload) => {
          const position = parseInt(payload.toString())
          if (!isNaN(position)) {
            setGrillState(prev => ({ ...prev, position, lastUpdate: new Date() }))
          }
        })
        subscriptions.push(unsubPos)

        // Subscribe to temperature updates
        const unsubTemp = await subscribe(`grill/${grillIndex}/${TOPICS.STATUS.SENSOR.TEMPERATURE}`, (topic, payload) => {
          const temperature = parseInt(payload.toString())
          if (!isNaN(temperature)) {
            setGrillState(prev => ({ ...prev, temperature, lastUpdate: new Date() }))
          }
        })
        subscriptions.push(unsubTemp)

        // Subscribe to rotation updates
        const unsubRot = await subscribe(`grill/${grillIndex}/${TOPICS.STATUS.SENSOR.ROTATION}`, (topic, payload) => {
          const rotation = parseInt(payload.toString())
          if (!isNaN(rotation)) {
            setGrillState(prev => ({ ...prev, rotation, lastUpdate: new Date() }))
          }
        })
        subscriptions.push(unsubRot)

      } catch (error) {
        toast.error('Error al suscribirse a actualizaciones de estado')
        console.error('MQTT subscription error:', error)
      }
    }

    setupSubscriptions()

    // Cleanup function
    return () => {
      subscriptions.forEach(unsub => unsub?.())
    }
  }, [isConnected, subscribe, grillIndex, grillParam, router])

  const sendCommand = async (topic: string, payload: string) => {
    if (!isConnected) {
      toast.error('MQTT no conectado')
      return
    }
    try {
      const fullTopic = `grill/${grillIndex}/${topic}`
      await publish(fullTopic, payload, { qos: 1, retain: false })
      toast.success(`Comando enviado a parrilla ${grillName.toLowerCase()}`)
    } catch (error) {
      toast.error('Error al enviar comando')
      console.error('MQTT publish error:', error)
    }
  }

  const handleDirectionCommand = (direction: GrillDirection) => {
    sendCommand(TOPICS.ACTION.MOVEMENT.VERTICAL, direction);
  }

  const handleRotationCommand = (rotation: GrillRotation) => {
    if (!isLeftGrill) return
    sendCommand(TOPICS.ACTION.MOVEMENT.ROTATION, rotation);
  }

  const handleSetPosition = () => {
    const pos = parseInt(targetPosition)
    if (isNaN(pos) || pos < 0 || pos > 100) {
      toast.error('Posición debe estar entre 0 y 100')
      return
    }
    sendCommand(TOPICS.ACTION.MOVEMENT.SET_POSITION, targetPosition)
    setTargetPosition('')
  }

  const handleSetTemperature = () => {
    const temp = parseInt(targetTemperature)
    if (isNaN(temp) || temp < 0 || temp > 500) {
      toast.error('Temperatura debe estar entre 0 y 500°C')
      return
    }
    // TODO: Implement TOPIC for setting temperature
    // sendCommand(TOPICS.ACTION.SENSOR.SET_TEMPERATURE, targetTemperature)
    toast.info("Funcionalidad (Set Temperature) pendiente de implementación en el firmware.");
    setTargetTemperature('')
  }

  const handleSetRotation = () => {
    if (!isLeftGrill) return
    const rot = parseInt(targetRotation)
    if (isNaN(rot) || rot < 0 || rot > 360) {
      toast.error('Rotación debe estar entre 0 y 360°')
      return
    }
    sendCommand(TOPICS.ACTION.MOVEMENT.SET_ROTATION, targetRotation)
    setTargetRotation('')
  }

  const handleCancelProgram = () => {
    if (confirm(`¿Estás seguro de cancelar el programa en la parrilla ${grillName.toLowerCase()}?`)) {
      sendCommand(TOPICS.ACTION.PROGRAM.CANCEL, '')
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
          <ConnectionStatus
            espConnectionStatus={espConnectionStatus}
            clientConnectionStatus={clientConnectionStatus}
            error={connectionError}
          />
        </div>

        {/* Grill Status Display */}
        <div className="mb-6">
          <GrillStatusDisplay
            title={`Estado Actual`}
            grillState={grillState}
            showRotation={isLeftGrill}
          />
        </div>

        {/* Control Panel: Render based on global state */}
        {!isProgramRunning && (
          <ControlPanel
            grillName={grillName}
            isConnected={isConnected}
            isProgramRunning={isProgramRunning}
            isLeftGrill={isLeftGrill}
            targetPosition={targetPosition}
            setTargetPosition={setTargetPosition}
            targetTemperature={targetTemperature}
            setTargetTemperature={setTargetTemperature}
            targetRotation={targetRotation}
            setTargetRotation={setTargetRotation}
            onDirectionCommand={handleDirectionCommand}
            onRotationCommand={handleRotationCommand}
            onSetPosition={handleSetPosition}
            onSetTemperature={handleSetTemperature}
            onSetRotation={handleSetRotation}
          />
        )}


        {/* Program Execution Status: Render based on global state, pass grillIndex */}
        {isProgramRunning && (
          <ProgramExecutionStatus
            handleCancelProgram={handleCancelProgram}
            isConnected={isConnected}
            grillIndex={grillIndex} // Pass index instead of program data
          />
        )}

      </div>
    </div>
  )
}

// Default export remains the same
export default function GrillControlPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 py-4 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Cargando control de parrilla...</p>
            </div>
          </div>
        </div>
      </div>
    }>
      <GrillControlContent />
    </Suspense>
  )
}


