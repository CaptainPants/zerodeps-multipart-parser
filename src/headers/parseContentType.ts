import { ParseError } from "../errors/index.js";
import { HeaderParserState } from "./internal/HeaderParserState.js";
import { isFinished } from "./internal/is.js";
import { processParametersIfPresent } from "./internal/parameters.js";
import { readToken } from "./internal/read.js";
import { ContentType } from "./types.js";

export function parseContentType(header: string): ContentType {
    const state: HeaderParserState = {
        index: 0,
        end: header.length,
        string: header,
    };

    const type: string = readToken(state);
    if (isFinished(state)) {
        throw new ParseError("Unexpected EOF when expecting '/'.");
    }
    if (state.string[state.index] != "/") {
        throw new ParseError(
            `Unexpected '${state.string[state.index]}' when expecting '/'.`
        );
    }
    ++state.index;
    const subtype: string = readToken(state);

    const parameters = processParametersIfPresent(state);

    return {
        type: type,
        subtype: subtype,
        parameters: parameters,
    };
}
