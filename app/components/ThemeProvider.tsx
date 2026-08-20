'use client'

import { ThemeProvider as MuiThemeProvider, CssBaseline } from "@mui/material";
import { createAwmTheme, type AwmColorMode } from "@/app/theme";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";

interface ColorModeContextValue {
  mode: AwmColorMode;
  toggleColorMode: () => void;
}

const ColorModeContext = createContext<ColorModeContextValue | null>(null);

export function useColorMode(): ColorModeContextValue {
  const context = useContext(ColorModeContext);
  if (!context) throw new Error("useColorMode must be used within ThemeProvider");
  return context;
}

export default function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<AwmColorMode>("light");
  const [preferenceLoaded, setPreferenceLoaded] = useState(false);

  useEffect(() => {
    let initialMode: AwmColorMode = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    try {
      const storedMode = window.localStorage.getItem("awm-color-mode");
      if (storedMode === "dark" || storedMode === "light") initialMode = storedMode;
    } catch {
      // Use the operating-system preference when storage is unavailable.
    }
    const frame = window.requestAnimationFrame(() => {
      setMode(initialMode);
      setPreferenceLoaded(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!preferenceLoaded) return;
    document.documentElement.dataset.theme = mode;
    document.documentElement.style.colorScheme = mode;
    try {
      window.localStorage.setItem("awm-color-mode", mode);
    } catch {
      // The preference still applies for this page when storage is unavailable.
    }
  }, [mode, preferenceLoaded]);

  const toggleColorMode = useCallback(() => {
    setMode((current) => current === "light" ? "dark" : "light");
  }, []);

  const theme = useMemo(() => createAwmTheme(mode), [mode]);
  const contextValue = useMemo(() => ({ mode, toggleColorMode }), [mode, toggleColorMode]);

  return (
    <ColorModeContext.Provider value={contextValue}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ColorModeContext.Provider>
  );
}
