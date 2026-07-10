'use client'

import { ThemeProvider as MuiThemeProvider, CssBaseline } from "@mui/material";
import { awmTheme } from "@/app/theme";
import { type ReactNode } from "react";

export default function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <MuiThemeProvider theme={awmTheme}>
      <CssBaseline />
      {children}
    </MuiThemeProvider>
  );
}
