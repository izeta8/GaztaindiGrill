"use client";

import { Link } from "next-view-transitions";
import { usePathname } from "next/navigation";
import { cn } from "@/utils/styles";
import { AlignHorizontalDistributeCenter, ArrowUpDown, List, PlusCircle, Flame, Radio } from "lucide-react";
import { useMqtt } from "@/hooks/useMqtt";

const NAV_ITEMS = [
  {
    label: "Control",
    href: "/control",
    icon: ArrowUpDown,
  },
  {
    label: "Modos",
    href: "/mode",
    icon: AlignHorizontalDistributeCenter,
  },
  {
    label: "Lista",
    href: "/programs/list",
    icon: List,
  },
  {
    label: "Crear",
    href: "/programs/create",
    icon: PlusCircle,
  },
];

export function Navbar() {
  const pathname = usePathname();
  const { isPublishing } = useMqtt();

  return (
    <nav className="sticky py-2 top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex flex-1 items-center justify-center overflow-hidden">
          <div className="flex items-center sm:space-x-2 overflow-x-auto no-scrollbar py-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center space-x-2 px-2 sm:px-3 py-2 rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground shrink-0",
                    isActive 
                      ? "bg-accent text-accent-foreground border border-gray-200" 
                      : "text-muted-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="inline-block text-xs">{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Indicador de transmisión (Feedback pasivo) */}
          <div className="flex items-center ml-4 shrink-0">
            <div className="relative flex items-center justify-center">
              <div 
                className={cn(
                  "w-2 h-2 rounded-full bg-white transition-all duration-150 shadow-[0_0_10px_rgba(255,255,255,0.8)]",
                  isPublishing ? "opacity-100 scale-125 bg-blue-400 shadow-blue-400" : "opacity-20 scale-100 bg-gray-400 shadow-none"
                )} 
              />
              <span className="sr-only">MQTT Activity</span>
            </div>
          </div>
        </div>
    </nav>
  );
}
