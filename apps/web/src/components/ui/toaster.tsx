'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/components/ui/use-toast';

export function Toaster() {
  const { toasts } = useToast();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="rounded-md border bg-card px-4 py-3 text-sm shadow-lg"
        >
          {t.title && <div className="font-semibold">{t.title}</div>}
          {t.description && <div className="text-muted-foreground">{t.description}</div>}
        </div>
      ))}
    </div>
  );
}