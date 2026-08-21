import { User, BarChart3, Info, MoveVertical } from "lucide-react";
import { RunningProgram } from "@/types";

interface ExecutionDetailsProps {
  runningProgram: RunningProgram;
}

export function ExecutionDetails({ runningProgram }: ExecutionDetailsProps) {
  const isRelative = runningProgram.referenceType === 'relative';

  return (
    <div className="mb-6 bg-gray-50/50 rounded-lg border border-gray-100 overflow-hidden">

      {/* Row 1: Author, Uses and Mode */}
      <div className="grid grid-cols-3 border-b border-gray-100">
        <div className="flex items-center gap-2 p-3 border-r border-gray-100">
          <User className="h-3 w-3 text-gray-400 flex-shrink-0" />
          <div className="flex flex-col min-w-0">
            <span className="text-[8px] font-bold text-gray-400 uppercase leading-none mb-1">Autor</span>
            <span className="text-[10px] font-bold text-gray-700 truncate">{runningProgram.creatorName ?? 'Sist.'}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 p-3 border-r border-gray-100">
          <BarChart3 className="h-3 w-3 text-gray-400 flex-shrink-0" />
          <div className="flex flex-col min-w-0">
            <span className="text-[8px] font-bold text-gray-400 uppercase leading-none mb-1">Usos</span>
            <span className="text-[10px] font-bold text-gray-700">{runningProgram.usageCount ?? 0}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 p-3">
          <MoveVertical className="h-3 w-3 text-gray-400 flex-shrink-0" />
          <div className="flex flex-col min-w-0">
            <span className="text-[8px] font-bold text-gray-400 uppercase leading-none mb-1">Modo</span>
            <span className={`text-[10px] font-bold truncate ${isRelative ? 'text-amber-600' : 'text-gray-700'}`}>
              {isRelative ? 'Relativo' : 'Absoluto'}
            </span>
          </div>
        </div>
      </div>
      
      {/* Row 2: Description */}
      <div className="p-3 flex items-start gap-2">
        <Info className="h-3 w-3 text-gray-400 mt-0.5 flex-shrink-0" />
        <div className="flex flex-col min-w-0">
          <span className="text-[8px] font-bold text-gray-400 uppercase leading-none mb-1">Descripción</span>
          <p className="text-[10px] font-bold text-gray-600 italic line-clamp-2 leading-relaxed">
            {runningProgram.description || 'Sin descripción disponible para este programa.'}
          </p>
        </div>
      </div>
    </div>
  );
}
