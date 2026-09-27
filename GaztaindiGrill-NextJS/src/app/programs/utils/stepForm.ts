import type { ProgramStep, ReferenceType } from '@/types'
import { ROTATION_WRAPS_AT, type StepFormState } from '@/app/programs/components/StepModal'

export const EMPTY_STEP_FORM: StepFormState = { type: '', time: '', temperature: '', position: '', rotation: '' }

export const stepToForm = (step: ProgramStep): StepFormState => ({
  type: step.temperature != null ? 'temperature'
      : step.rotation != null ? 'rotation'
      : step.position != null ? 'position'
      : 'wait',
  time: step.time?.toString() || '',
  temperature: step.temperature?.toString() || '',
  position: step.position?.toString() || '',
  rotation: step.rotation?.toString() || ''
})

// Null while the form is still missing its value; `error` is the text to show the user.
export const formToStep = (
  stepForm: StepFormState,
  referenceType: ReferenceType
): { step: ProgramStep } | { error: string } | null => {
  if (stepForm.type === 'wait') {
    if (!stepForm.time) return null
    const secs = parseInt(stepForm.time)
    // The firmware skips a step with time 0.
    if (isNaN(secs) || secs <= 0) return { error: 'La espera tiene que ser mayor que cero' }
    return { step: { time: secs } }
  }
  if (stepForm.type === 'temperature') {
    if (!stepForm.temperature) return null
    return { step: { temperature: parseInt(stepForm.temperature) } }
  }
  if (stepForm.type === 'position') {
    if (!stepForm.position) return null
    const pos = parseInt(stepForm.position)
    if (isNaN(pos) || (referenceType === "absolute" && (pos < 0 || pos > 100))) {
      return {
        error: referenceType === "absolute"
          ? 'La posición debe estar entre 0 y 100'
          : 'La posición debe ser un número válido'
      }
    }
    return { step: { position: pos } }
  }
  if (stepForm.type === 'rotation') {
    if (!stepForm.rotation) return null
    const inc = parseInt(stepForm.rotation)
    if (isNaN(inc) || inc < 0 || inc >= ROTATION_WRAPS_AT) {
      return { error: `La rotación debe estar entre 0 y ${ROTATION_WRAPS_AT - 1}` }
    }
    return { step: { rotation: inc } }
  }
  return null
}
