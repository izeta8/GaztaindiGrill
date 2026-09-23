import { Thermometer } from "lucide-react";
import { useGrillState } from "@/app/control/hooks/useGrillState";
import type { TemperatureHold } from "@/types";

interface TemperatureHoldLineProps {
  hold: TemperatureHold;
  grillIndex: 0 | 1;
}

// A state line rather than toasts: the firmware re-sends it whenever it changes, and a toast per
// change would pile up over a long cook.
export function TemperatureHoldLine({ hold, grillIndex }: TemperatureHoldLineProps) {
  const { temperature: current } = useGrillState(grillIndex);
  const target = `${hold.temperature}°C`;

  const lines: Record<TemperatureHold['status'], { text: string; warning: boolean }> = {
    reaching: { text: `Buscando ${target}`, warning: false },
    holding: { text: `Manteniendo ${hold.temperature} ±${hold.band}°C`, warning: false },
    fire_too_weak: { text: 'Fuego flojo: parrilla al mínimo', warning: true },
    fire_too_strong: { text: 'Fuego demasiado fuerte: parrilla al máximo', warning: true },
    not_reached: { text: `No se alcanzó ${target}`, warning: true },
    sensor_failed: { text: 'Termopar sin lectura', warning: true },
  };
  const { text, warning } = lines[hold.status];

  return (
    <div
      className={`inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full text-[11px] font-bold ${
        warning ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'
      }`}
    >
      <Thermometer className="h-3.5 w-3.5" />
      <span>{text}</span>
      {current !== null && <span className="font-medium opacity-70">· ahora {current}°C</span>}
    </div>
  );
}
