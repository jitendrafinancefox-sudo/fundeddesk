"use client";

import type { ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { getQueryClient } from "@v2/services/query/client";
import { TerminalThemeProvider } from "@v2/engine/theme";
import "@v2/styles/globals.css";

export default function WebTerminalV2Layout({ children }: { children: ReactNode }) {
  return (
    <TerminalThemeProvider>
      <QueryClientProvider client={getQueryClient()}>{children}</QueryClientProvider>
    </TerminalThemeProvider>
  );
}
