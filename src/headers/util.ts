import { startsWith } from "../internal/util/startsWith.js";
import { isAttrChar } from "./internal/is.js";

export function isTextMediaType(mediaType: string | undefined) {
    if (mediaType === undefined) {
        return false;
    } else if (startsWith(mediaType, "text/")) {
        return true;
    } else if (mediaType.match(/^application\/(?:[^+]+\+)?(json|xml)/)) {
        return true;
    }

    return false;
}

export function isMultipartMediaType(mediaType: string | undefined) {
    if (mediaType === undefined) {
        return false;
    }

    return startsWith(mediaType, "multipart/");
}

export function isValidNonExtendedParameterValue(value: string) {
    for (let i = 0; i < value.length; ++i) {
        if (!isAttrChar(value[i])) {
            return false;
        }
    }
    return true;
}

export function sanitizeNonExtendedParameterValue(value: string) {
    const res: string[] = [];
    for (let i = 0; i < value.length; ++i) {
        const current = value[i];
        if (isAttrChar(current)) {
            res.push(current);
        }
    }
    return res.join("");
}
