import { polyfill_Promise } from "./promise";

export function polyfill_minimum(overwrite = false) {
    polyfill_Promise(overwrite);
}
