"use client";

import { initPosthog, trackPageView } from "@/lib/analytics";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect } from "react";

export function AnalyticsProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    initPosthog();
  }, []);

  useEffect(() => {
    void pathname; // re-fire on route change
    trackPageView();
  }, [pathname]);

  return <>{children}</>;
}
