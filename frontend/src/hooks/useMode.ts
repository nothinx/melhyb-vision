import { useSyncExternalStore } from "react";
import { dengarkanMode, modeSekarang } from "../lib/api";

export function useMode() {
  return useSyncExternalStore(dengarkanMode, modeSekarang, modeSekarang);
}
