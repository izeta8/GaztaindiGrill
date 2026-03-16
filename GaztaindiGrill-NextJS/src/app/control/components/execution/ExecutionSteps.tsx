import { getStepIcon, getStepDescription } from "@/utils";
import { ProgramStep } from "@/types";

interface ExecutionStepsProps {
  steps: ProgramStep[];
  currentStepIndex: number;
}

export function ExecutionSteps({ steps, currentStepIndex }: ExecutionStepsProps) {
  return (
    <div className="mb-6">
      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 px-1">Secuencia</h4>
      <div className="space-y-1.5 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
        {steps.map((step, index) => {
          const isPast = index < currentStepIndex;
          const isCurrent = index === currentStepIndex;

          return (
            <div
              key={index}
              className={`
                flex items-center gap-3 p-2.5 rounded-lg transition-all border
                ${isCurrent 
                  ? 'bg-blue-50 border-blue-200 shadow-sm' 
                  : isPast 
                    ? 'bg-white border-transparent opacity-40' 
                    : 'bg-white border-gray-50 text-gray-500'}
              `}
            >
              <span className={`
                flex-shrink-0 w-6 h-6 rounded flex items-center justify-center text-[10px] font-black
                ${isCurrent ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-400'}
              `}>
                {index + 1}
              </span>
              
              <div className={`flex-shrink-0 scale-90 ${isCurrent ? 'text-blue-500' : 'text-gray-400'}`}>
                {getStepIcon(step)}
              </div>
              
              <span className={`text-[11px] font-semibold flex-grow ${isCurrent ? 'text-blue-900' : ''}`}>
                {getStepDescription(step)}
              </span>

              {/* {isCurrent && (
                <p>ESTE SITIO ES PARA PONER EL TIEMPO DE EJECUCION DEL PASO</p>
              )} */}
           
            </div>
          );
        })}
      </div>
    </div>
  );
}
