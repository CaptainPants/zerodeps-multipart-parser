import { Parameter } from "./Parameter.js";

export type Parameters = Parameter[];

export interface ContentType {
    type: string;
    subtype: string;
    parameters: Parameters;
}

/**
 * TODO: look at filename* in https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Disposition and https://datatracker.ietf.org/doc/html/rfc5987
 */
export interface ContentDisposition {
    type: string;
    parameters: Parameters;
}
