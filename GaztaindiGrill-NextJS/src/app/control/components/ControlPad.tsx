import { useState } from 'react';
import { Button } from '@/components/ui/Button';

interface ControlPadProps {
  onUp: () => void;
  onStop: () => void;
  onDown: () => void;
  isConnected: boolean;
  icons: {
    up: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    stop: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    down: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  };
}

export function ControlPad({ onUp, onStop, onDown, isConnected, icons }: ControlPadProps) {
  const [active, setActive] = useState<'up' | 'down' | null>(null);

  const handleUp = () => {
    setActive('up');
    onUp();
  };

  const handleStop = () => {
    setActive(null);
    onStop();
  };

  const handleDown = () => {
    setActive('down');
    onDown();
  };

  const IconUp = icons.up;
  const IconStop = icons.stop;
  const IconDown = icons.down;

  return (
    <div className="bg-white p-2 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-1.5 w-full max-w-[80px]">
      <Button 
        onClick={handleUp} 
        disabled={!isConnected}
        className={`h-12 rounded-xl transition-all group p-0 border-none ${
          active === 'up' 
            ? 'bg-gray-700 text-white hover:bg-gray-600' 
            : 'bg-slate-50 hover:bg-blue-50 text-black'
        }`}
      >
        <IconUp className={`h-5 w-5 group-active:scale-125 transition-transform ${active === 'up' ? 'text-white' : 'text-black'}`} />
      </Button>

      <Button 
        onClick={handleStop} 
        disabled={!isConnected}
        variant="secondary"
        className="h-12 rounded-xl bg-slate-100 text-black border-none transition-all p-0"
      >
        <IconStop className="h-5 w-5" />
      </Button>

      <Button 
        onClick={handleDown} 
        disabled={!isConnected}
        className={`h-12 rounded-xl transition-all group p-0 border-none ${
          active === 'down' 
            ? 'bg-gray-700 text-white hover:bg-gray-600' 
            : 'bg-slate-50 hover:bg-blue-50 text-black'
        }`}
      >
        <IconDown className={`h-5 w-5 group-active:scale-125 transition-transform ${active === 'down' ? 'text-white' : 'text-black'}`} />
      </Button>
    </div>
  );
}
