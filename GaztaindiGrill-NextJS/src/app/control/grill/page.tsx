"use client"

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useMqtt } from '../../../../hooks/useMqtt'
import { GrillStatusDisplay } from './components/GrillStatusDisplay'
import type { GrillState, GrillDirection, GrillRotation } from '../../../../types'
import { TOPIC_CANCEL_PROGRAM, TOPIC_MOVE, TOPIC_SET_POSITION, TOPIC_SET_TEMPERATURE, TOPIC_SET_TILT, TOPIC_TILT, TOPIC_UPDATE_POSITION, TOPIC_UPDATE_TEMPERATURE, TOPIC_UPDATE_TILT } from '@/constants/mqtt'
import { ConnectionStatus } from '@/components/shared/ConnectionStatus'
import { ConnectionStatus as ConnectionStatusEnum } from '../../../../types'
import { ControlPanel } from './components/ControlPanel'
import { ProgramExecutionStatus } from './components/ProgramExecutionStatus'
import { useRunningPrograms } from '@/contexts/RunningProgramsContext'

function GrillControlContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  // Subscribe is still needed for local state (position, temp, etc.)
  const { publish, subscribe, espConnectionStatus, clientConnectionStatus, error: connectionError } = useMqtt()
  // Get the program state hook
  const { getProgramOnGrill } = useRunningPrograms();

  // Get grill index from query params
  const grillParam = searchParams.get('index')
  const grillIndex = grillParam === '1' ? 1 : 0
  const isLeftGrill = grillIndex === 0
  const grillName = isLeftGrill ? 'Izquierda' : 'Derecha'

  // Get program state for this specific grill
  const programState = getProgramOnGrill(grillIndex);
  const isProgramRunning = !!programState.data; // Check if data exists in the global state

  const [grillState, setGrillState] = useState<GrillState>({
    position: 0,
    temperature: 0,
    rotation: 0,
    lastUpdate: null
  })

  // Local state for input fields remains
  const [targetPosition, setTargetPosition] = useState('')
  const [targetTemperature, setTargetTemperature] = useState('')
  const [targetRotation, setTargetRotation] = useState('')
  // Removed local runningProgram state
  // const [runningProgram, setRunningProgram] = useState<RunningProgramStatus|null>(null)

  const isConnected = espConnectionStatus === ConnectionStatusEnum.Connected && clientConnectionStatus === ConnectionStatusEnum.Connected;

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
        // --- Removed fetchProgramStatus and its subscriptions ---

        // Subscribe to position updates
        const unsubPos = await subscribe(`grill/${grillIndex}/${TOPIC_UPDATE_POSITION}`, (topic, payload) => {
          const position = parseInt(payload.toString())
          if (!isNaN(position)) {
            setGrillState(prev => ({ ...prev, position, lastUpdate: new Date() }))
          }
        })
        subscriptions.push(unsubPos)

        // Subscribe to temperature updates
        const unsubTemp = await subscribe(`grill/${grillIndex}/${TOPIC_UPDATE_TEMPERATURE}`, (topic, payload) => {
          const temperature = parseInt(payload.toString())
          if (!isNaN(temperature)) {
            setGrillState(prev => ({ ...prev, temperature, lastUpdate: new Date() }))
          }
        })
        subscriptions.push(unsubTemp)

        // Subscribe to rotation updates (tilt)
        const unsubRot = await subscribe(`grill/${grillIndex}/${TOPIC_UPDATE_TILT}`, (topic, payload) => {
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
      subscriptions.forEach(unsub => unsub?.()) // Use optional chaining for safety
    }
    // Dependency array updated
  }, [isConnected, subscribe, grillIndex, grillParam, router])

  // --- sendCommand and manual control handlers remain the same ---
  const sendCommand = async (topic: string, payload: string) => {
    if (!isConnected) {
      toast.error('MQTT no conectado')
      return
    }
    try {
      const fullTopic = `grill/${grillIndex}/${topic}`
      await publish(fullTopic, payload, { qos: 1 })
      toast.success(`Comando enviado a parrilla ${grillName.toLowerCase()}`)
    } catch (error) {
      toast.error('Error al enviar comando')
      console.error('MQTT publish error:', error)
    }
  }

  const handleDirectionCommand = (direction: GrillDirection) => {
    sendCommand(TOPIC_MOVE, direction)
  }

  const handleRotationCommand = (rotation: GrillRotation) => {
    if (!isLeftGrill) return
    sendCommand(TOPIC_TILT, rotation)
  }

  const handleSetPosition = () => {
    const pos = parseInt(targetPosition)
    if (isNaN(pos) || pos < 0 || pos > 100) {
      toast.error('Posición debe estar entre 0 y 100')
      return
    }
    sendCommand(TOPIC_SET_POSITION, targetPosition)
    setTargetPosition('')
  }

  const handleSetTemperature = () => {
    const temp = parseInt(targetTemperature)
    if (isNaN(temp) || temp < 0 || temp > 500) {
      toast.error('Temperatura debe estar entre 0 y 500°C')
      return
    }
    sendCommand(TOPIC_SET_TEMPERATURE, targetTemperature)
    setTargetTemperature('')
  }

  const handleSetRotation = () => {
    if (!isLeftGrill) return
    const rot = parseInt(targetRotation)
    if (isNaN(rot) || rot < 0 || rot > 360) {
      toast.error('Rotación debe estar entre 0 y 360°')
      return
    }
    sendCommand(TOPIC_SET_TILT, targetRotation)
    setTargetRotation('')
  }

  // Cancel program handler remains the same
  const handleCancelProgram = () => {
    // Confirmation dialog text in Spanish
    if (confirm(`¿Estás seguro de cancelar el programa en la parrilla ${grillName.toLowerCase()}?`)) {
      sendCommand(TOPIC_CANCEL_PROGRAM, '')
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

