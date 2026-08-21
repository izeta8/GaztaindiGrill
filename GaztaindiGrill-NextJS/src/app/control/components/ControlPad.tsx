import { Button } from '@/components/ui/Button';
import { GrillDirection, GrillRotation } from '@/types';
import { PAYLOAD_UP, PAYLOAD_DOWN, PAYLOAD_STOP, PAYLOAD_CLOCKWISE, PAYLOAD_COUNTER_CLOCKWISE } from '@/constants/mqtt';

interface ControlPadProps {
  onUp: () => void;
  onStop: () => void;
  onDown: () => void;
  isConnected: boolean;
  movement: GrillDirection | GrillRotation; // Supports both types
  icons: {
    up: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    stop: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    down: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  };
}

export function ControlPad({ onUp, onStop, onDown, isConnected, movement, icons }: ControlPadProps) {
  const IconUp = icons.up;
  const IconStop = icons.stop;
  const IconDown = icons.down;

  const isUpActive = movement === PAYLOAD_UP || movement === PAYLOAD_COUNTER_CLOCKWISE;
  const isDownActive = movement === PAYLOAD_DOWN || movement === PAYLOAD_CLOCKWISE;
  const isStopActive = movement === PAYLOAD_STOP;

  return (
    <div className="bg-white p-2 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-1.5 w-full max-w-[80px]">
      <Button 
        onClick={onUp} 
        disabled={!isConnected}
        className={`h-12 rounded-xl transition-all group p-0 border-none ${
          isUpActive 
            ? 'bg-gray-700 text-white hover:bg-gray-600 shadow-lg scale-[1.02]' 
            : 'bg-slate-50 hover:bg-blue-50 text-black'
        }`}
      >
        <IconUp className={`h-5 w-5 group-active:scale-125 transition-transform ${isUpActive ? 'text-white' : 'text-black'}`} />
      </Button>

      <Button 
        onClick={onStop} 
        disabled={!isConnected}
        variant="secondary"
        className={`h-12 rounded-xl border-none transition-all p-0 ${
          isStopActive 
            ? 'bg-gray-700 text-white shadow-lg' 
            : 'bg-slate-100 text-black'
        }`}
      >
        <IconStop className={`h-5 w-5 transition-colors ${isStopActive ? 'text-white' : 'text-black'}`} />
      </Button>

      <Button 
        onClick={onDown} 
        disabled={!isConnected}
        className={`h-12 rounded-xl transition-all group p-0 border-none ${
          isDownActive 
            ? 'bg-gray-700 text-white hover:bg-gray-600 shadow-lg scale-[1.02]' 
            : 'bg-slate-50 hover:bg-blue-50 text-black'
        }`}
      >
        <IconDown className={`h-5 w-5 group-active:scale-125 transition-transform ${isDownActive ? 'text-white' : 'text-black'}`} />
      </Button>
    </div>
  );
}
