'use client';

import { useEffect } from 'react';
import { registerServiceWorker } from '@/lib/pwa';

export function PWAProvider() {
  useEffect(() => {
    registerServiceWorker();
  }, []);

  return null;
}