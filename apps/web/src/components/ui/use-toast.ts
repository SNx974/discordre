'use client';

import { useState, useCallback } from 'react';

interface Toast {
  id: string;
  title?: string;
  description?: string;
}

let listeners: Array<(t: Toast) => void> = [];

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useState(() => {
    const l = (t: Toast) => setToasts((s) => [...s, t]);
    listeners.push(l);
    return () => {
      listeners = listeners.filter((x) => x !== l);
    };
  });

  const toast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    listeners.forEach((l) => l({ ...t, id }));
    setTimeout(() => setToasts((s) => s.filter((x) => x.id !== id)), 4000);
  }, []);

  return { toasts, toast };
}