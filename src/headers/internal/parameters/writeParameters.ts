import { stringFind } from "../../../internal/util/stringFind.js";
import { Parameter } from "../../Parameter.js";
import { Parameters } from "../../types.js";
import { isQuoteSafe, isTCHAR } from "../is.js";
import { writeExtendedValue } from "./writeExtendedValue.js";

// Refer https://datatracker.ietf.org/doc/html/rfc8187#section-3.1
// https://datatracker.ietf.org/doc/html/rfc9110#section-5.6.6 references 8187

export async function writeOneParameter(param: Parameter): Promise<string> {
    const res: string[] = [];

    if (param.name.length < 1) {
        throw new Error(
            "Expected header name to have at least once character."
        );
    }

    res.push("; ");
    res.push(param.name);
    res.push("=");

    if (param.isExtended) {
        // note that param.charset is ignored as only utf-8 is supported
        if (param.charset !== undefined && param.charset !== "utf-8") {
            throw new Error(`Charset ${param.charset} not supported.`);
        }
        res.push("utf-8'");
        if (param.language) res.push(param.language);
        res.push("'");
        res.push(await writeExtendedValue(param.value));
    } else {
        const anyNonToken =
            stringFind(param.value, (chr) => !isTCHAR(chr)) !== undefined;

        if (anyNonToken) {
            res.push('"');

            for (let i = 0; i < param.value.length; ++i) {
                const char = param.value[i];

                if (!isQuoteSafe(char)) {
                    res.push("\\");
                }
                res.push(char);
            }
            res.push('"');
        } else {
            res.push(param.value);
        }
    }

    return res.join("");
}

export async function writeParameters(parameters: Parameters): Promise<string> {
    const res: string[] = [];

    for (const param of parameters) {
        res.push(await writeOneParameter(param));
    }

    return res.join("");
}
