import type { ReactNode } from 'react';
import { createContext, useContext } from 'react';

export type MacShellVariant = 'store' | 'admin';

const MacShellContext = createContext<MacShellVariant | null>(null);

export function MacShellProvider({ variant, children }: { variant: MacShellVariant; children: ReactNode }) {
  return <MacShellContext.Provider value={variant}>{children}</MacShellContext.Provider>;
}

export function useMacShell() {
  return useContext(MacShellContext);
}
