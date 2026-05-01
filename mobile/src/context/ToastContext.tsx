import React, { createContext, useCallback, useContext, useState } from 'react';
import { Alert } from 'react-native';

type ToastType = 'success' | 'error' | 'info';

type ShowOpts = { type?: ToastType; message: string };

type ToastContextValue = {
  show: (opts: ShowOpts) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const show = useCallback((opts: ShowOpts) => {
    const { message, type = 'info' } = opts;
    const title = type === 'error' ? 'Error' : type === 'success' ? 'Success' : 'Notice';
    Alert.alert(title, message);
  }, []);

  return <ToastContext.Provider value={{ show }}>{children}</ToastContext.Provider>;
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
