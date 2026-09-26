"use client"

import { useEffect, useState } from 'react';

// Before its first NTP sync the ESP32 stamps seconds since boot, not a date.
const MIN_PLAUSIBLE_UNIX = 1_000_000_000;

// Seconds elapsed since a UTC unix timestamp, ticking every second. Null when there is no real date.
export function useSecondsSince(unix?: number): number | null {
  const [now, setNow] = useState(() => Date.now());

  const valid = unix != null && unix >= MIN_PLAUSIBLE_UNIX;

  useEffect(() => {
    if (!valid) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [valid, unix]);

  if (!valid) return null;
  // Clamped because the tablet's clock may run a little behind the ESP32's.
  return Math.max(0, Math.floor(now / 1000) - unix);
}
