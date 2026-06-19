import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createJSONStorage, persist } from 'zustand/middleware';

type CustomerUiState = {
  darkMode: boolean;
  toast: { title: string; body?: string } | null;
  setDarkMode: (value: boolean) => void;
  showToast: (title: string, body?: string) => void;
  clearToast: () => void;
};

export const useCustomerUiStore = create<CustomerUiState>()(
  persist(
    (set) => ({
      darkMode: true,
      toast: null,
      setDarkMode: (darkMode) => set({ darkMode }),
      showToast: (title, body) => set({ toast: { title, body } }),
      clearToast: () => set({ toast: null }),
    }),
    {
      name: 'customer-ui',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ darkMode: s.darkMode }),
    },
  ),
);
