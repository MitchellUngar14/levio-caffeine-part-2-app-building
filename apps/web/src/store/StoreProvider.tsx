import type { CaffeineStore } from "@caffeine/core";
import { createContext, useContext, type ReactNode } from "react";

const StoreContext = createContext<CaffeineStore | null>(null);

export function StoreProvider({ store, children }: { store: CaffeineStore; children: ReactNode }) {
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

/** The app's data access. Components never see a concrete store class. */
export function useStore(): CaffeineStore {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useStore must be used inside <StoreProvider>");
  return store;
}
