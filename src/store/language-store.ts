"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { Language } from "@/lib/i18n";

interface LanguageState {
  language: Language;
  setLanguage: (lang: Language) => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: "de",
      setLanguage: (language) => set({ language }),
    }),
    {
      name: "erasmus-language",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
