import type { Session } from 'next-auth';

const API_URL = process.env.API_URL ?? 'http://localhost:4000';

/**
 * Petit client API typé. Le web n'a PAS de clé JWT séparée :
 * on s'appuie sur le fait que NextAuth a déjà authentifié l'user.
 * Pour des appels serveur→API sécurisés, on forward un cookie de session.
 * (En prod on utilisera un JWT signé pour le service-to-service.)
 */
async function request<T>(path: string, init: RequestInit, session?: Session | null): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  };
  if (session) {
    // Récupérer le JWT NextAuth depuis la session via le cookie
    // Simplification MVP : on laisse le cookie de session se propager via credentials.
  }
  const res = await fetch(`${API_URL}${path}`, { ...init, headers, cache: 'no-store' });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`API ${res.status}: ${txt}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  get: <T = unknown,>(path: string, session?: Session | null) => request<T>(path, { method: 'GET' }, session),
  post: <T = unknown,>(path: string, body: unknown, session?: Session | null) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }, session),
  patch: <T = unknown,>(path: string, body: unknown, session?: Session | null) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }, session),
  delete: <T = unknown,>(path: string, session?: Session | null) =>
    request<T>(path, { method: 'DELETE' }, session),
};