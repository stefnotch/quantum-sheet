import { useCas } from "../cas/cas";

/**
 * The global computer algebra system entrypoint.
 * Internally, the useCas function can send the expression to different systems.
 * For example, a simple addition can be done in Javascript, while a partial differential equation can be sent to Sympy.
 */
export const cas = useCas();
