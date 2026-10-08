import { create } from 'zustand';
import { en, TranslationKeys } from './en';
import { ta } from './ta';

type Language = 'en' | 'ta';

interface LanguageState {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKeys) => string;
}

export const useLanguageStore = create<LanguageState>((set, get) => ({
  language: 'en',
  setLanguage: (lang: Language) => set({ language: lang }),
  t: (key: TranslationKeys) => {
    const lang = get().language;
    if (lang === 'ta' && ta[key]) {
      return ta[key];
    }
    return en[key] || key;
  }
}));

export function t(key: TranslationKeys): string {
  return useLanguageStore.getState().t(key);
}
