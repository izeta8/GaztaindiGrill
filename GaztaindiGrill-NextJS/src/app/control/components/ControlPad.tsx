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
  const IconUp = icons.up;
  const IconStop = icons.stop;
  const IconDown = icons.down;

  return (
    <div className="bg-white p-2 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-1.5 w-full max-w-[80px]">
      <Button 
        onClick={onUp} 
        disabled={!isConnected}
        className="h-12 rounded-xl bg-slate-50 hover:bg-blue-50 text-black border-none transition-all group p-0"
      >
        <IconUp className="h-5 w-5 text-black group-active:scale-125 transition-transform" />
      </Button>

      <Button 
        onClick={onStop} 
        disabled={!isConnected}
        variant="secondary"
        className="h-12 rounded-xl bg-slate-100 text-black border-none transition-all p-0"
      >
        <IconStop className="h-5 w-5" />
      </Button>

      <Button 
        onClick={onDown} 
        disabled={!isConnected}
        className="h-12 rounded-xl bg-slate-50 hover:bg-blue-50 text-black border-none transition-all group p-0"
      >
        <IconDown className="h-5 w-5 text-black group-active:scale-125 transition-transform" />
      </Button>
    </div>
  );
}
