"use client"

import { LocateFixed, Pause, Play, RotateCcw, SkipForward, Thermometer } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import SimulatorScene from '@/components/three/SimulatorScene'
import { SIMULATION_SPEEDS, useProgramSimulation } from '@/app/programs/hooks/useProgramSimulation'
import type { SimulationStart } from '@/app/programs/hooks/useSimulationStart'
import type { ProgramStep, ReferenceType } from '@/types'
import { formatSeconds, getStepDescription, getStepIcon, stepNotice } from '@/utils'

// TEMPERATURE_BAND in GrillConstants.h. The simulator has no fire, so it only names the band.
const TEMPERATURE_BAND = 5

type ProgramSimulatorProps = {
  steps: ProgramStep[]
  referenceType: ReferenceType
  simulationStart: SimulationStart
}

export function ProgramSimulator({ steps, referenceType, simulationStart }: ProgramSimulatorProps) {
  const { start } = simulationStart

  const { plan, status, stepIndex, speed, readout, getPose, play, pause, skip, reset, setSpeed } =
    useProgramSimulation(steps, referenceType, start)

  const current = status === 'running' || status === 'paused' ? plan[stepIndex] : undefined
  const holding = current?.holding ?? null
  const waitLeft = current?.phases[0]?.kind === 'wait'
    ? Math.max(0, current.phases[0].duration - readout.stepElapsed)
    : null

  return (
    <div className="space-y-4">
      <div className="relative">
        <SimulatorScene getPose={getPose} />
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center rounded-xl bg-white/90 border border-gray-200 shadow-sm px-3 h-10 text-base font-semibold text-gray-900 whitespace-nowrap">
          {readout.position}% · {readout.rotation}°
        </div>
      </div>

      {holding !== null && (
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-orange-50 text-orange-600">
          <Thermometer className="h-3.5 w-3.5" />
          <span>Manteniendo {holding} ±{TEMPERATURE_BAND}°C</span>
          <span className="font-medium opacity-70">· salta el paso para seguir</span>
        </div>
      )}

      <div className="flex gap-2">
        {status === 'running' ? (
          <Button onClick={pause} className="flex-1" ariaLabel="Pausar simulación">
            <Pause className="h-4 w-4 mr-2" />
            Pausar
          </Button>
        ) : (
          <Button onClick={play} className="flex-1" disabled={plan.length === 0} ariaLabel="Iniciar simulación">
            <Play className="h-4 w-4 mr-2" />
            {status === 'paused' ? 'Reanudar' : 'Iniciar'}
          </Button>
        )}
        <Button
          onClick={skip}
          variant="secondary"
          disabled={status !== 'running' && status !== 'paused'}
          ariaLabel="Saltar paso"
        >
          <SkipForward className="h-4 w-4 sm:mr-2" />
          <span className="max-sm:hidden">Saltar paso</span>
        </Button>
        <Button onClick={reset} variant="secondary" disabled={status === 'idle'} ariaLabel="Reiniciar simulación">
          <RotateCcw className="h-4 w-4 sm:mr-2" />
          <span className="max-sm:hidden">Reiniciar</span>
        </Button>
      </div>

      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
        {SIMULATION_SPEEDS.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setSpeed(value)}
            className={`flex-1 h-9 rounded-lg text-sm font-semibold transition-colors ${speed === value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
          >
            x{value}
          </button>
        ))}
      </div>

      {referenceType === 'relative' && (
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <Input
              label="Punto de partida (%)"
              type="number"
              value={simulationStart.input}
              onChange={simulationStart.setInput}
              min={0}
              max={100}
            />
          </div>
          <Button
            onClick={simulationStart.followRealGrill}
            variant="secondary"
            disabled={simulationStart.followsRealGrill}
            ariaLabel="Usar la altura actual de la parrilla"
            className="h-10"
          >
            <LocateFixed className="h-4 w-4 sm:mr-2" />
            <span className="max-sm:hidden">Altura actual</span>
          </Button>
        </div>
      )}

      {plan.length === 0 && (
        <p className="text-sm text-gray-500 text-center">Añade pasos para simular el programa</p>
      )}

      <div className="space-y-2">
        {plan.map((simulated, index) => {
          const isCurrent = current !== undefined && index === stepIndex
          const isDone = (status === 'running' || status === 'paused') ? index < stepIndex : status === 'finished'
          const notice = stepNotice(simulated)
          return (
            <div
              key={index}
              className={`p-3 border rounded-lg transition-colors ${
                isCurrent ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-gray-50'
              } ${isDone ? 'opacity-50' : ''}`}
            >
              <div className="flex items-center gap-3">
                <span className="font-medium text-sm text-gray-600">#{index + 1}</span>
                <span className="max-[360px]:hidden">{getStepIcon(steps[index])}</span>
                <span className="flex-1 text-sm font-medium">{getStepDescription(steps[index])}</span>
                {isCurrent && waitLeft !== null && (
                  <span className="text-xs font-semibold text-blue-700 whitespace-nowrap">
                    quedan {formatSeconds(waitLeft)}
                  </span>
                )}
              </div>
              {notice && <p className="mt-1 text-xs text-amber-700">{notice}</p>}
            </div>
          )
        })}
      </div>

      {status === 'finished' && (
        <p className="text-sm text-gray-500 text-center">Simulación terminada</p>
      )}
    </div>
  )
}
