
import { ParseError } from '..';
import { HeaderParserState, Parameters, processParametersIfPresent } from './internal';

import { isFinished, readToken, consumeOptionalWhitespace, readOptionalToken, readQuoted } from './internal';

// TODO: look at filename* in https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Disposition
export interface ContentDisposition {
    type: string;
    parameters: Parameters;
    name: string | undefined;
    filename: string | undefined;
    filenameStar: string | undefined;
}

export function parseContentDisposition(header: string): ContentDisposition {
    const state: HeaderParserState = {
        index: 0,
        end: header.length,
        string: header
    };

    const type: string = readToken(state);

    const parameters = processParametersIfPresent(state);

    const filenameIndex = parameters.findIndex(x => x.name == 'filename');
    const filenameStarIndex = parameters.findIndex(x => x.name == 'filename*');
    const nameIndex = parameters.findIndex(x => x.name == 'name');

    return {
        type: type,
        parameters: parameters,
        name: nameIndex >= 0 ? parameters[nameIndex].value.toLowerCase() : undefined,
        filename: filenameIndex >= 0 ? parameters[filenameIndex].value : undefined,
        filenameStar: filenameStarIndex >= 0 ? parameters[filenameStarIndex].value : undefined
    };
}

export const __testing = process.env.NODE_ENV == 'test' ? {
    consumeOptionalWhitespace,
    readToken,
    readOptionalToken,
    readQuoted
} : void 0;