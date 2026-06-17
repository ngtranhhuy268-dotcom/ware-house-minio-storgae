"use client";

import axios from "axios";
import { clearSession, getApiBaseUrl, loadSession, saveSession } from "./auth-storage";
import type { AuthSession } from "./types";

type RetriableRequest = {
  _retry?: boolean;
  headers?: Record<string, string>;
};

const apiBaseUrl = getApiBaseUrl();

export const api = axios.create({
  baseURL: apiBaseUrl,
});

let refreshPromise: Promise<AuthSession | null> | null = null;

function redirectToLogin() {
  if (typeof window !== "undefined" && window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
}

api.interceptors.request.use((config) => {
  const session = loadSession();

  if (session?.accessToken) {
    config.headers.Authorization = `Bearer ${session.accessToken}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as typeof error.config & RetriableRequest;
    const session = loadSession();

    if (error.response?.status === 401 && !originalRequest?._retry && session) {
      originalRequest._retry = true;

      if (!refreshPromise) {
        refreshPromise = axios
          .post(`${apiBaseUrl}/auth/refresh`, {
            refreshToken: session.refreshToken,
          })
          .then((response) => {
            const nextSession: AuthSession = {
              user: response.data.user,
              accessToken: response.data.accessToken,
              refreshToken: response.data.refreshToken,
              expiresIn: response.data.expiresIn,
            };

            saveSession(nextSession);
            return nextSession;
          })
          .catch(() => {
            clearSession();
            redirectToLogin();
            return null;
          })
          .finally(() => {
            refreshPromise = null;
          });
      }

      const nextSession = await refreshPromise;

      if (nextSession) {
        originalRequest.headers = {
          ...(originalRequest.headers ?? {}),
          Authorization: `Bearer ${nextSession.accessToken}`,
        };
        return api(originalRequest);
      }
    }

    if (error.response?.status === 401) {
      clearSession();
      redirectToLogin();
    }

    return Promise.reject(error);
  },
);
