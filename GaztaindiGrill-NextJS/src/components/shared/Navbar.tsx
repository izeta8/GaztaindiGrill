"use client";

import { Link } from "next-view-transitions";
import { usePathname } from "next/navigation";
import { cn } from "@/utils/styles";
import { AlignHorizontalDistributeCenter, ArrowUpDown, List, PlusCircle, Flame } from "lucide-react";

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

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center px-4 max-w-screen-2xl mx-auto w-full">

        <div className="flex flex-1 items-center justify-center overflow-hidden">
          <div className="flex items-center w-full justify-between space-x-1 sm:space-x-2 overflow-x-auto no-scrollbar py-1">
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
                  <span className="inline-block">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>

      </div>
    </nav>
  );
}
