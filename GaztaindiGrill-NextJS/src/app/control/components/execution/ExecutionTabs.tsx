import { Lock } from "lucide-react";

interface ExecutionTabsProps {
  activeTab: 0 | 1;
  hasProgram0: boolean;
  hasProgram1: boolean;
  onTabChange: (index: 0 | 1) => void;
}

export function ExecutionTabs({ activeTab, hasProgram0, hasProgram1, onTabChange }: ExecutionTabsProps) {
  return (
    <div className="flex border-b border-gray-100 bg-gray-50/50">
      <button
        onClick={() => onTabChange(0)}
        disabled={!hasProgram0}
        className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 border-r border-gray-100 ${
          activeTab === 0 
            ? "bg-white text-blue-600 border-b-2 border-b-blue-500" 
            : hasProgram0 
              ? "text-gray-400 hover:text-gray-600 hover:bg-gray-100" 
              : "text-gray-300 cursor-not-allowed opacity-50"
        }`}
      >
        {!hasProgram0 && <Lock className="h-3 w-3" />}
        Parrilla Izquierda 
        {hasProgram0 && <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />}
      </button>

      <button
        onClick={() => onTabChange(1)}
        disabled={!hasProgram1}
        className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
          activeTab === 1 
            ? "bg-white text-blue-600 border-b-2 border-b-blue-500" 
            : hasProgram1 
              ? "text-gray-400 hover:text-gray-600 hover:bg-gray-100" 
              : "text-gray-300 cursor-not-allowed opacity-50"
        }`}
      >
        {!hasProgram1 && <Lock className="h-3 w-3" />}
        Parrilla Derecha
        {hasProgram1 && <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />}
      </button>
    </div>
  );
}
