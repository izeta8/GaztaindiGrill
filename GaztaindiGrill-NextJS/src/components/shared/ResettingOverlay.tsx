"use client";

import React from "react";
import { useMqtt } from "@/hooks/useMqtt";
import { ResetStatus } from "@/types";
import { Loader2 } from "lucide-react";
import GrillScene from "@/components/three/GrillScene";

export const ResettingOverlay = () => {

  const { resetStatus } = useMqtt();

  if (resetStatus !== ResetStatus.Resetting) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background/80 backdrop-blur-md">
      <div className="flex flex-col items-center space-y-6 p-8 rounded-2xl border border-border bg-card shadow-2xl">
       
        {/* Spinner */}
        {/* <Loader2 className="h-12 w-12 text-primary animate-spin" /> */}

        {/* Content */}
        <div className="text-center">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Reseteando la parrilla
          </h2>

          <GrillScene />

          <p className="text-muted-foreground w-full text-center text-sm">
            Los actuadores se están reseteando. Por favor, espera.
          </p>
        </div>

      </div>
    </div>
  );
};
