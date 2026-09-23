// Mirror of MovementManager::min_safe_position() in the firmware, with the constants from
// GrillConstants.h. The grill applies its own floor anyway, so a drift here only shows a target
// the grill will raise on its own — but both sides should be changed together.
const CLEARANCE_PCT = 10
const ROTATION_MAX_DROP_PCT = 50
const ROTOR_MARGIN = 3

// Lowest position (0-100) at which a rack at this tilt keeps its lower edge off the embers.
export const minSafePosition = (degrees: number): number => {
  const fromHorizontal = ((degrees % 180) + 180) % 180

  // Horizontal, either face up, has no edge hanging below the axis.
  if (fromHorizontal <= ROTOR_MARGIN || fromHorizontal >= 180 - ROTOR_MARGIN) return 0

  const drop = ROTATION_MAX_DROP_PCT * Math.abs(Math.sin((degrees * Math.PI) / 180))
  return Math.min(100, Math.ceil(drop) + CLEARANCE_PCT)
}
