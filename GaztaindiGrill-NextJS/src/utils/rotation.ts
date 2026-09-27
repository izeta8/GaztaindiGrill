// Mirror of MovementManager's rotation rules in the firmware (min_safe_position(),
// min_safe_position_for_turn(), start_rotation_to()), with the constants from GrillConstants.h.
// The grill applies its own rules anyway, so a drift here only misleads the modal and the program
// simulator — but both sides should be changed together.
const CLEARANCE_PCT = 10
const ROTATION_MAX_DROP_PCT = 50
export const ROTOR_MARGIN = 3
const SAFE_ROTATION_POSITION_PCT = 60

const wrap = (degrees: number) => ((degrees % 360) + 360) % 360

// Lowest position (0-100) at which a rack at this tilt keeps its lower edge off the embers.
export const minSafePosition = (degrees: number): number => {
  const fromHorizontal = ((degrees % 180) + 180) % 180

  // Horizontal, either face up, has no edge hanging below the axis.
  if (fromHorizontal <= ROTOR_MARGIN || fromHorizontal >= 180 - ROTOR_MARGIN) return 0

  const drop = ROTATION_MAX_DROP_PCT * Math.abs(Math.sin((degrees * Math.PI) / 180))
  return Math.min(100, Math.ceil(drop) + CLEARANCE_PCT)
}

// Signed degrees the rotor turns: the shorter way round, counting down on a tie.
export const rotorTurn = (from: number, to: number): number => {
  const up = wrap(to - from)
  const down = wrap(from - to)
  return up < down ? up : -down
}

// The rack keeps tilting as it turns, so the whole arc has to clear the embers, not just the end.
// 0 when no point of the arc hangs lower than the rack does now: a turn towards flat needs nothing.
export const minSafePositionForTurn = (from: number, to: number): number => {
  const forward = wrap(to - from)
  const span = forward <= 180 ? forward : 360 - forward
  const start = forward <= 180 ? from : to
  const covers = (angle: number) => wrap(angle - start) <= span

  const fromFloor = minSafePosition(from)
  const worst = covers(90) || covers(270) ? SAFE_ROTATION_POSITION_PCT : Math.max(fromFloor, minSafePosition(to))
  return worst > fromFloor ? worst : 0
}
