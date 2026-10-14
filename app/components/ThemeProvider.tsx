'use client'

import { ThemeProvider as MuiThemeProvider, CssBaseline } from "@mui/material";
import { createAwmTheme, type AwmColorMode } from "@/app/theme";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";

interface ColorModeContextValue {
  mode: AwmColorMode;
  toggleColorMode: () => void;
}

const ColorModeContext = createContext<ColorModeContextValue | null>(null);

/* Brief universal colour transition while the theme flips; the class is
   removed right after so hover/focus animations stay instant. Injected
   inline because the CSS pipeline strips universal selectors. */
const THEME_ANIM_CSS = `.theme-animating,.theme-animating *,.theme-animating *::before,.theme-animating *::after{transition:background-color .4s ease,color .4s ease,border-color .4s ease,fill .4s ease,stroke .4s ease,box-shadow .4s ease !important}`;

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
    const root = document.documentElement;
    /* Tween the switch: the class applies a brief universal colour
       transition, then comes off so hover animations stay instant. */
    root.classList.add("theme-animating");
    root.dataset.theme = mode;
    root.style.colorScheme = mode;
    const settle = window.setTimeout(() => root.classList.remove("theme-animating"), 450);
    try {
      window.localStorage.setItem("awm-color-mode", mode);
    } catch {
      // The preference still applies for this page when storage is unavailable.
    }
    return () => window.clearTimeout(settle);
  }, [mode, preferenceLoaded]);

  const toggleColorMode = useCallback(() => {
    setMode((current) => current === "light" ? "dark" : "light");
  }, []);

  const theme = useMemo(() => createAwmTheme(mode), [mode]);
  const contextValue = useMemo(() => ({ mode, toggleColorMode }), [mode, toggleColorMode]);

  return (
    <ColorModeContext.Provider value={contextValue}>
      <style>{THEME_ANIM_CSS}</style>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ColorModeContext.Provider>
  );
}
