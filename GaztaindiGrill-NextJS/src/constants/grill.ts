// Limits the firmware enforces. Mirrored here only to warn the user in advance.

// Lowest position (0-100%) the grill can rotate from: below it the grill raises itself first
// and comes back down after the turn. Owned by GrillConstants::SAFE_ROTATION_POSITION_PCT.
export const SAFE_ROTATION_POSITION = 60
