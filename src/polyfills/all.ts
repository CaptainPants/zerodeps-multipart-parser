import { polyfill_AbortController, polyfill_EventTarget } from "./abort";
import { polyfill_Promise } from "./promise";

export function polyfill_all(overwrite = false) {
    polyfill_EventTarget(overwrite);
    polyfill_AbortController(overwrite);
    polyfill_Promise(overwrite);
}