import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ThemeState { theme: "light" | "dark"; toggleTheme: () => void; setTheme: (t: "light" | "dark") => void; }

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: "light",
      toggleTheme: () => {
        const next = get().theme === "light" ? "dark" : "light";
        // Keep the persisted store and the DOM class in sync so Tailwind's dark
        // variants update immediately without waiting for a full rerender.
        if (typeof document !== "undefined") document.documentElement.classList.toggle("dark", next === "dark");
        set({ theme: next });
      },
      setTheme: (t) => {
        if (typeof document !== "undefined") document.documentElement.classList.toggle("dark", t === "dark");
        set({ theme: t });
      },
    }),
    { name: "dt-theme" }
  )
);
