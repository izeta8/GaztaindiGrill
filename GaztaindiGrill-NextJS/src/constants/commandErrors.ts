// The firmware sends error CODES, never display text: the wording lives here so that changing
// a message never means reflashing the grill. 
// Keep the keys in sync with the ERROR_* constants in GaztaindiGrill/lib/Grill/GrillConstants.h.
export const COMMAND_ERROR_MESSAGES: Record<string, string> = {
  invalid_json: 'La parrilla no ha entendido la orden',
  no_steps: 'El programa no tiene ningún paso',
  no_rotor: 'Esta parrilla no tiene rotor',
  rotation_out_of_range: 'La rotación debe estar entre 0 y 359 grados',
  mode_change_denied: 'No se puede cambiar de modo con un programa en marcha',
  no_program_running: 'No hay ningún programa en marcha',
  resetting: 'La parrilla se está reiniciando, espera unos segundos',
}

// Falls back to a generic message so a firmware that
// is newer than this client never shows an empty toast.
export function commandErrorMessage(code?: string): string {
  if (code && COMMAND_ERROR_MESSAGES[code]) return COMMAND_ERROR_MESSAGES[code]
  return 'No se pudo completar la acción'
}
