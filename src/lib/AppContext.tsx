/**
 * AppContext — bridge antara useStore (Supabase) dan semua halaman.
 * Halaman cukup import useApp() untuk akses semua data & actions.
 */
import React, { createContext, useContext } from 'react';
import type { AppStore } from './useStore';

export const AppContext = createContext<AppStore | null>(null);

export function useApp(): AppStore {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppContext.Provider');
  return ctx;
}
