import { Pencil } from "lucide-react";
import { getStepIcon, getStepDescription, formatDuration } from "@/utils";
import { RunningProgramStep } from "@/types";
import { useSecondsSince } from "@/app/control/hooks/useSecondsSince";
import type { StepNoticeText } from "@/app/control/hooks/useRunningStepNotices";

interface ExecutionStepsProps {
  steps: RunningProgramStep[];
  currentStepIndex: number;
  // By step index; null where the step will do what it says.
  notices: (StepNoticeText | null)[];
  // Absent when the grill is offline: nothing could be sent.
  onEdit?: (index: number) => void;
}

// Same precedence as the firmware: time only makes a wait step when nothing else is set.
const isWaitStep = (step: RunningProgramStep) =>
  step.time != null && step.action == null && step.temperature == null && step.position == null && step.rotation == null;

function WaitCountdown({ step }: { step: RunningProgramStep }) {
  const elapsed = useSecondsSince(step.stepStartUnix);
  if (elapsed === null) return null;

  return (
    <span className="flex-shrink-0 text-[11px] font-bold tabular-nums text-blue-600">
      quedan {formatDuration(Math.max(0, step.time! - elapsed))}
    </span>
  );
}

// A step under way has already started, except a wait, which the firmware re-reads every pass. An
// action has no value to change.
const isEditable = (step: RunningProgramStep, index: number, currentStepIndex: number) =>
  step.action == null && (index > currentStepIndex || (index === currentStepIndex && isWaitStep(step)));

export function ExecutionSteps({ steps, currentStepIndex, notices, onEdit }: ExecutionStepsProps) {
  return (
    <div className="mb-6">
      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 px-1">Secuencia</h4>
      <div className="space-y-1.5 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
        {steps.map((step, index) => {
          const isPast = index < currentStepIndex;
          const isCurrent = index === currentStepIndex;
          const notice = notices[index];

          return (
            <div
              key={index}
              className={`
                p-2.5 rounded-lg transition-all border
                ${isCurrent 
                  ? 'bg-blue-50 border-blue-200 shadow-sm' 
                  : isPast 
                    ? 'bg-white border-transparent opacity-40' 
                    : 'bg-white border-gray-50 text-gray-500'}
              `}
            >
              <div className="flex items-center gap-3">
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

                {isCurrent && isWaitStep(step) && <WaitCountdown step={step} />}

                {onEdit && isEditable(step, index, currentStepIndex) && (
                  <button
                    type="button"
                    onClick={() => onEdit(index)}
                    aria-label={`Editar paso ${index + 1} en esta ejecución`}
                    className="flex-shrink-0 p-1.5 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              {notice && (
                <p className={`mt-1 pl-9 text-[11px] ${notice.warning ? 'text-amber-700' : 'text-gray-500'}`}>{notice.text}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
