import { blobToArrayBuffer, blobToString, expensiveCompativalBlobSourceToString, stringToArrayBuffer } from "./internal.js";

export type DataSource = string | ArrayBuffer | DataView | Blob;

export type BinaryResult<T extends Blob | DataView | ArrayBuffer> = { value: T; encoding: string | undefined };

/**
  * A generic container for data of either text or binary format, allowing easy conversion to the desire format for processing. In modern browsers this is similar
  * to the Response class. Note that any conversions from string to binary will be encoded using utf-8 as that is the only format guaranteed by standards for 
  * TextEncoder and the Blob constructor.
  * as some conversion methods are asynchronous.
  * @param source The original source data to later be converted.
  * @param sourceEncoding The encoding used on string data stored in binary format.
  */
export class Data {
    constructor(
        public source: DataSource,
        public sourceEncoding?: string | undefined
    ) {
        if (!(typeof source === 'string' || source instanceof DataView || source instanceof ArrayBuffer || source instanceof Blob)) {
            throw new TypeError(`Unexpected data type ${source}.`);
        }
    }

    public string(): Promise<string> {
        if (typeof this.source === 'string') {
            return Promise.resolve(this.source);
        }
        else if (this.source instanceof Blob) {
            // Binary to binary retains source encoding
            return blobToString(this.source, this.sourceEncoding);
        }
        else {
            if (typeof TextDecoder !== 'undefined') {
                return Promise.resolve(new TextDecoder(this.sourceEncoding).decode(this.source));
            }
            else {
                // Basically IE11 here
                return expensiveCompativalBlobSourceToString(this.source, 'utf-8');
            }
        }
    }

    public async arrayBuffer(): Promise<BinaryResult<ArrayBuffer>> {
        if (this.source instanceof ArrayBuffer) {
            return { value: this.source, encoding: this.sourceEncoding };
        }
        else if (this.source instanceof DataView) {
            const target = new ArrayBuffer(this.source.byteLength);
            const targetTypedArray = new Uint8Array(target);
            targetTypedArray.set(new Uint8Array(this.source.buffer, this.source.byteOffset, this.source.byteLength));
            return { value: target, encoding: this.sourceEncoding };
        }
        else if (this.source instanceof Blob) {
            return { value: await blobToArrayBuffer(this.source), encoding: this.sourceEncoding };
        }
        else {
            // String path
            // Always utf-8 when converting from string to binary
            return { value: await stringToArrayBuffer(this.source), encoding: 'utf-8' };
        }
    }

    public blob(): Promise<BinaryResult<Blob>> {
        if (this.source instanceof Blob) {
            // Binary to binary retains source encoding
            return Promise.resolve({ value: this.source, encoding: this.sourceEncoding });
        }
        else if (typeof this.source === 'string') {
            // Blob constructor always converts to utf-8
            // https://developer.mozilla.org/en-US/docs/Web/API/Blob/Blob
            return Promise.resolve({ value: new Blob([this.source]), encoding: 'utf-8' });
        }
        else {
            // Binary to binary retains source encoding
            return Promise.resolve({ value: new Blob([this.source]), encoding: this.sourceEncoding });
        }
    }

    public async dataView(): Promise<BinaryResult<DataView>> {
        if (this.source instanceof ArrayBuffer) {
            // binary to binary retains source encoding
            return { value: new DataView(this.source), encoding: this.sourceEncoding };
        }
        else if (this.source instanceof DataView) {
            // binary to binary retains source encoding
            return { value: this.source, encoding: this.sourceEncoding };
        }
        else if (this.source instanceof Blob) {
            // binary to binary retains source encoding
            return { value: new DataView(await blobToArrayBuffer(this.source)), encoding: this.sourceEncoding };
        }
        else {
            return { value: new DataView(await stringToArrayBuffer(this.source)), encoding: 'utf-8' };
        }
    }
}