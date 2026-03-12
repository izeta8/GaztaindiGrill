import { User, BarChart3, Info } from "lucide-react";
import { RunningProgram } from "@/types";

interface ExecutionDetailsProps {
  runningProgram: RunningProgram;
}

export function ExecutionDetails({ runningProgram }: ExecutionDetailsProps) {
  return (
    <div className="mb-6 bg-gray-50/50 rounded-lg border border-gray-100 overflow-hidden">

      {/* Fila 1: Autor y Usos */}
      <div className="grid grid-cols-2 border-b border-gray-100">
        <div className="flex items-center gap-2 p-3 border-r border-gray-100">
          <User className="h-3 w-3 text-gray-400 flex-shrink-0" />
          <div className="flex flex-col min-w-0">
            <span className="text-[8px] font-bold text-gray-400 uppercase leading-none mb-1">Autor</span>
            <span className="text-[10px] font-bold text-gray-700 truncate">{runningProgram.creatorName ?? 'Sist.'}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 p-3">
          <BarChart3 className="h-3 w-3 text-gray-400 flex-shrink-0" />
          <div className="flex flex-col min-w-0">
            <span className="text-[8px] font-bold text-gray-400 uppercase leading-none mb-1">Usos</span>
            <span className="text-[10px] font-bold text-gray-700">{runningProgram.usageCount ?? 0}</span>
          </div>
        </div>
      </div>
      
      {/* Fila 2: Descripción (Ancho completo) */}
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
