
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User, Paciente } from "@/types";
import { setSessionCookie, clearSessionCookie } from "@/lib/cookie-utils";

interface AuthState {
  user: User | null;
  pacienteSeleccionado: Paciente | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  setPacienteSeleccionado: (paciente: Paciente | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  pacienteSeleccionado: null,
  isAuthenticated: false,

  setUser: (user) => {
    // SECURITY FIX: Set secure session cookie when user logs in
    if (user?.id) {
      setSessionCookie(user.id);
    }
    set({
      user,
      isAuthenticated: !!user,
    });
  },

  setPacienteSeleccionado: (paciente) =>
    set({ pacienteSeleccionado: paciente }),

  logout: () => {
    // SECURITY FIX: Clear session cookie with proper handling
    clearSessionCookie();
    set({
      user: null,
      pacienteSeleccionado: null,
      isAuthenticated: false,
    });
  },
}));
