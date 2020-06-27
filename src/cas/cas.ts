import { usePyodide } from "./pyodide-cas";

export function useCas() {
  const cas: CAS = usePyodide();

  return {
    cas,
  };
}
