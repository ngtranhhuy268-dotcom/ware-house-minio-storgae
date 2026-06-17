"use client";

import { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";
import { clearSession, getApiBaseUrl, loadSession, onAuthChanged, saveSession } from "./auth-storage";
import type { AuthSession } from "./types";
import { api } from "./api-client";

type AuthContextValue = {
  ready: boolean;
  session: AuthSession | null;
  login: (email: string, password: string) => Promise<AuthSession>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<AuthSession | null>(null);

  useEffect(() => {
    setSession(loadSession());
    setReady(true);

    return onAuthChanged(() => {
      setSession(loadSession());
    });
  }, []);

  async function login(email: string, password: string) {
    const response = await axios.post(`${getApiBaseUrl()}/auth/login`, {
      email,
      password,
    });

    const nextSession: AuthSession = {
      user: response.data.user,
      accessToken: response.data.accessToken,
      refreshToken: response.data.refreshToken,
      expiresIn: response.data.expiresIn,
    };

    saveSession(nextSession);
    setSession(nextSession);
    return nextSession;
  }

  async function logout() {
    try {
      await api.post("/auth/logout");
    } catch {
      // Ignore logout transport errors and clear client session anyway.
    } finally {
      clearSession();
      setSession(null);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        ready,
        session,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
