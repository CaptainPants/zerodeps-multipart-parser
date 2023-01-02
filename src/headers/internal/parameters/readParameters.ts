import { ParseError } from "../../../errors/ParseError.js";
import { Parameter } from "../../Parameter.js";
import { Parameters } from "../../types.js";
import { HeaderParserState } from "../HeaderParserState.js";
import { isAttrChar } from "../is.js";
import { readOptionalWhitespace } from "../readOptionalWhitespace.js";
import { readQuotedString } from "../readQuotedString.js";
import { readOptionalToken, readToken } from "../readToken.js";
import { readPercentEncoded } from "./readPercentEncoded.js";

/**
 * https://datatracker.ietf.org/doc/html/rfc9110#section-5.6.6
 */
export function readOneParameter(
    state: HeaderParserState
): Parameter | undefined {
    // sitting just after the previous parameter
    readOptionalWhitespace(state);

    if (state.isFinished()) {
        return undefined;
    }

    // there should be a ; between parameters
    const semicolon = state.current();
    if (semicolon !== ";") {
        throw new ParseError(
            `Unexpected '${semicolon}' when expecting a semi-colon ';'.`
        );
    }

    // move past semicolon
    state.moveNext();

    readOptionalWhitespace(state);

    const parameterName = readOptionalToken(state);

    if (!parameterName) {
        if (state.isFinished()) {
            return undefined;
        } else {
            throw new ParseError(
                `Unexpected ${state.current()}, expecting a token.`
            );
        }
    }

    const isExtended = Parameter.isExtendedName(parameterName);

    // No whitespace is allowed
    // https://datatracker.ietf.org/doc/html/rfc9110#section-5.6.6

    if (state.isFinished() || state.current() !== "=") {
        throw new ParseError(
            `Unexpected ${state.current()}, expecting an equals sign.`
        );
    }

    // move past the =
    state.moveNext();

    // No whitespace is allowed
    // https://datatracker.ietf.org/doc/html/rfc9110#section-5.6.6

    if (state.isFinished()) {
        throw new ParseError(
            `Unexpected EOF, expecting a token or quoted-string.`
        );
    }

    // == Branch here for extended
    if (isExtended) {
        const { value, language, charset } = readExtendedValue(state);

        return new Parameter(parameterName, value, language, charset);
    } else {
        let value: string;

        if (state.current() === '"') {
            value = readQuotedString(state);
        } else {
            value = readToken(state);
        }

        return new Parameter(parameterName, value);
    }
}

/**
 * See syntax https://datatracker.ietf.org/doc/html/rfc8187#section-3.2.1
 * Language tag is defined here https://datatracker.ietf.org/doc/html/rfc5646#section-2.1
 */
function readExtendedValue(state: HeaderParserState): {
    value: string;
    language: string;
    charset: string;
} {
    // 'charset', current this MUST be utf-8 with possibility for future charsets
    if (!state.isAt("utf-8")) {
        throw new ParseError(
            `Unexpected ${state.current()}, expected token utf-8.`
        );
    }
    state.move(5);

    if (state.current() !== "'")
        throw new ParseError(
            `Unexpected ${state.current()}, expected token '.`
        );

    state.moveNext(); // Move past the '

    const startOfLanguageIndex = state.index();

    // TODO: properly parse language tag, this is just searching for a closing '
    while (state.current() != "'" && !state.isFinished()) {
        state.moveNext();
    }

    if (state.isFinished()) {
        throw new ParseError(`Unexpected EOF, expected part of language.`);
    }

    const language = state.string.substring(
        startOfLanguageIndex,
        state.index()
    );

    if (state.current() != "'") {
        throw new ParseError(`Unexpected ${state.current()}, expecting '.`);
    }
    state.moveNext(); // Move past the '

    const partsOfValue: string[] = [];

    // Read to the end
    for (;;) {
        const current = state.current();

        // EOF
        if (current === undefined) {
            break; // finished
        }

        if (isAttrChar(current)) {
            partsOfValue.push(current);
            state.moveNext();
            continue;
        }

        // read a sequence of percent encoded characters
        const read = readPercentEncoded(state);
        if (typeof read !== "undefined") {
            partsOfValue.push(read);
            // Note that readPercentEncoded alread moved the state forward
            continue;
        }

        break;
    }

    return {
        charset: "utf-8",
        language: language,
        value: partsOfValue.join(""),
    };
}

/**
 * TODO: currently does not support * parameters https://datatracker.ietf.org/doc/html/rfc5987
 * @param state
 * @returns
 */
export function processParametersIfPresent(
    state: HeaderParserState
): Parameters {
    const res: Parameters = [];

    for (;;) {
        // then a parameter
        const parameter = readOneParameter(state);

        if (!parameter) {
            if (!state.isFinished()) {
                throw new ParseError(
                    `Unexpected '${state.current()}' when expecting parameter or EOF.`
                );
            }
            break; // technically a violation of the standard but we'll allow it
        }

        res.push(parameter);
    }

    return res;
}
