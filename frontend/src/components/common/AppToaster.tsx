"use client";

import { Toaster } from "sonner";

import { useTheme } from "@/context/ThemeContext";

export function AppToaster() {
  const { theme } = useTheme();

  return (
    <Toaster position="top-center" richColors theme={theme} closeButton />
  );
}
