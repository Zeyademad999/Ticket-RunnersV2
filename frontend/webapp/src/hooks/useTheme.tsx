import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import React from "react";

interface ThemeCtx {
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeCtx | undefined>(undefined);

const getInitialTheme = () => {
  if (typeof window === "undefined") return true;
  const stored = localStorage.getItem("theme");
  if (stored === "light") return false;
  if (stored === "dark") return true;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [isDark, setIsDark] = useState<boolean>(getInitialTheme);

  useEffect(() => {
    const html = document.documentElement;
    if (isDark) html.classList.remove("light");
    else html.classList.add("light");
    localStorage.setItem("theme", isDark ? "dark" : "light");
  }, [isDark]);

  const toggleTheme = useCallback(() => setIsDark((d) => !d), []);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
};
