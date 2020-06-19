import { usePyodide } from "./pyodide-cas";

export function useCas() {
  const cas = usePyodide();

  return {
    cas,
  };
}
