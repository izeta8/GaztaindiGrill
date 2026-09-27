import type { ProgramStep, ReferenceType } from '@/types'
import { ROTOR_MARGIN, minSafePosition, minSafePositionForTurn, rotorTurn } from './rotation'

// Replays a program the way ProgramManager and MovementManager run it, without the grill.

// Rough speeds, the same as scripts/fake-grill.mjs: the firmware does not know its own.
const POSITION_PER_SECOND = 8
const DEGREES_PER_SECOND = 30

export interface GrillPose {
  position: number
  rotation: number
}

// `lift` and `return` are the rotation guard's detour up to a safe height and back.
export type SimulationPhaseKind = 'move' | 'lift' | 'rotate' | 'return' | 'wait' | 'hold'

export interface SimulationPhase {
  kind: SimulationPhaseKind
  from: GrillPose
  to: GrillPose
  // Seconds. A temperature step holds forever: only skipping it moves on.
  duration: number
}

export interface SimulatedStep {
  phases: SimulationPhase[]
  start: GrillPose
  end: GrillPose
  // Temperature the firmware keeps holding while this step runs.
  holding: number | null
  // A relative height that went past 0 or 100 and was cut to the edge.
  clamped?: { requested: number; applied: number }
  // A height the tilt does not allow, raised to its floor.
  raised?: { requested: number; applied: number }
}

const clampPosition = (position: number) => Math.min(100, Math.max(0, position))

const phase = (kind: SimulationPhaseKind, from: GrillPose, to: GrillPose, duration: number): SimulationPhase =>
  ({ kind, from, to, duration })

const moveTo = (kind: SimulationPhaseKind, from: GrillPose, position: number) =>
  phase(kind, from, { ...from, position }, Math.abs(position - from.position) / POSITION_PER_SECOND)

// MovementManager::go_to_rotor(): lift first if the arc needs it, turn, then back down.
const turnPhases = (from: GrillPose, degrees: number): SimulationPhase[] => {
  const turn = rotorTurn(from.rotation, degrees)
  if (Math.abs(turn) <= ROTOR_MARGIN) return []

  const phases: SimulationPhase[] = []
  const required = minSafePositionForTurn(from.rotation, degrees)
  const lifted = from.position < required
  let pose = from

  if (lifted) {
    phases.push(moveTo('lift', pose, required))
    pose = phases[phases.length - 1].to
  }

  phases.push(phase('rotate', pose, { ...pose, rotation: degrees }, Math.abs(turn) / DEGREES_PER_SECOND))
  pose = phases[phases.length - 1].to

  // Back where the lift started, or as close as the new tilt allows.
  const destination = Math.max(from.position, minSafePosition(degrees))
  if (lifted && destination !== pose.position) phases.push(moveTo('return', pose, destination))

  return phases
}

// Resolved in the firmware's order: action, temperature, position, rotation, time.
export const planSimulation = (steps: ProgramStep[], referenceType: ReferenceType, start: GrillPose): SimulatedStep[] => {
  const anchor = start.position
  let pose = start
  let holding: number | null = null

  return steps.map((step) => {
    const simulated: SimulatedStep = { phases: [], start: pose, end: pose, holding }

    if (step.action) {
      if (step.action === 'flip') simulated.phases = turnPhases(pose, (pose.rotation + 180) % 360)
    } else if (step.temperature != null) {
      holding = step.temperature
      simulated.holding = holding
      simulated.phases = [phase('hold', pose, pose, Infinity)]
    } else if (step.position != null) {
      // An explicit height replaces whatever temperature was being held.
      holding = null
      simulated.holding = null

      const requested = referenceType === 'relative' ? anchor + step.position : step.position
      const clamped = clampPosition(requested)
      const applied = Math.max(clamped, minSafePosition(pose.rotation))
      if (clamped !== requested) simulated.clamped = { requested, applied: clamped }
      if (applied !== clamped) simulated.raised = { requested: clamped, applied }

      simulated.phases = [moveTo('move', pose, applied)]
    } else if (step.rotation != null) {
      if (step.rotation >= 0 && step.rotation < 360) simulated.phases = turnPhases(pose, step.rotation)
    } else if (step.time != null && step.time > 0) {
      simulated.phases = [phase('wait', pose, pose, step.time)]
    }

    if (simulated.phases.length > 0) simulated.end = simulated.phases[simulated.phases.length - 1].to
    pose = simulated.end
    return simulated
  })
}

// How a step will really run, in the user's words. `warning` when the step will not do exactly
// what was written; otherwise it only tells what the grill does on its own.
export const stepNotice = (step: SimulatedStep): { text: string; warning: boolean } | null => {
  if (step.clamped) {
    return { text: `Se sale del recorrido: ${step.clamped.requested}% se quedará en ${step.clamped.applied}%`, warning: true }
  }
  if (step.raised) {
    return { text: `Con esa inclinación no puede bajar de ${step.raised.applied}%: se quedará ahí`, warning: true }
  }
  const lift = step.phases.find((current) => current.kind === 'lift')
  if (lift) {
    const comesDown = step.end.position < lift.to.position
    const text = `La parrilla subirá sola al ${lift.to.position}% antes de girar, para no tocar las brasas`
    const after = comesDown
      ? `, y luego bajará al ${step.end.position}%`
      : ', y se quedará ahí: con esa inclinación no es seguro bajar más'
    return { text: text + after, warning: false }
  }
  return null
}

export const stepDuration = (step: SimulatedStep) =>
  step.phases.reduce((total, current) => total + current.duration, 0)

// Where the grill is `elapsed` seconds into the step.
export const poseAt = (step: SimulatedStep, elapsed: number): GrillPose => {
  let remaining = elapsed
  for (const current of step.phases) {
    if (remaining < current.duration) {
      const t = current.duration === Infinity ? 0 : remaining / current.duration
      const turn = rotorTurn(current.from.rotation, current.to.rotation)
      return {
        position: current.from.position + (current.to.position - current.from.position) * t,
        rotation: (((current.from.rotation + turn * t) % 360) + 360) % 360,
      }
    }
    remaining -= current.duration
  }
  return step.end
}
