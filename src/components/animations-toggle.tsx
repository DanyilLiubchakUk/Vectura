"use client";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { AnimationsState, useSparksStore } from "@/stores/animations-toggle";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Unlink } from "lucide-react";

export function AnimationsToggle() {
  const userEnabled = useSparksStore((s: AnimationsState) => s.userEnabled);
  const setUserEnabled = useSparksStore((s: AnimationsState) => s.setUserEnabled);

  const [sysReduced, setSysReduced] = useState(false);

  useEffect(() => {
    setSysReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  const effectiveEnabled = userEnabled === null ? !sysReduced : userEnabled;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          title={`Animations: ${userEnabled === null ? `System (${sysReduced ? "Reduced" : "Normal"})` : (effectiveEnabled ? "On" : "Off")}`}
          aria-label="Toggle Animations"
        >
          <Unlink className="h-4 w-4" />
          <span className="sr-only">Toggle Animations</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setUserEnabled(true)} aria-label="Enable animations">
          Enable Animations
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setUserEnabled(false)} aria-label="Disable animations">
          Disable Animations
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setUserEnabled(null)} aria-label="Reset animations to system default">
          System Default
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
