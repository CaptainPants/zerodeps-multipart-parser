import { describe, expect, test } from "@jest/globals";
import { asciiToDataViewForTesting } from "./internal";
import { MultipartParser } from "./MultipartParser";

describe("parse", () => {
    test("example1", () => {
        const boundary = "9051914041544843365972754266";

        const dataview =
            asciiToDataViewForTesting(`--9051914041544843365972754266\r
Content-Disposition: form-data; name="text"\r
\r
text default\r
--9051914041544843365972754266\r
Content-Disposition: form-data; name="file1"; filename="a.txt"\r
Content-Type: text/plain\r
\r
Content of a.txt.\r
\r
--9051914041544843365972754266\r
Content-Disposition: form-data; name="file2"; filename="a.html"\r
Content-Type: text/html\r
\r
<!DOCTYPE html><title>Content of a.html.</title>\r
\r
--9051914041544843365972754266--`);

        const parser = new MultipartParser();

        const result = parser.parseDataView(boundary, dataview).parts;

        expect(result).toHaveLength(3);
        expect(result[0]!.headers).toHaveLength(1);
        expect(result[0]!.headers[0]!.name).toEqual("Content-Disposition");
        expect(result[0]!.headers[0]!.value).toEqual('form-data; name="text"');

        expect(result[1]!.headers).toHaveLength(2);
        expect(result[1]!.headers[0]!.name).toEqual("Content-Disposition");
        expect(result[1]!.headers[0]!.value).toEqual(
            'form-data; name="file1"; filename="a.txt"'
        );
        expect(result[1]!.headers[1]!.name).toEqual("Content-Type");
        expect(result[1]!.headers[1]!.value).toEqual("text/plain");

        expect(result[2]!.headers).toHaveLength(2);
        expect(result[2]!.headers[0]!.name).toEqual("Content-Disposition");
        expect(result[2]!.headers[0]!.value).toEqual(
            'form-data; name="file2"; filename="a.html"'
        );
        expect(result[2]!.headers[1]!.name).toEqual("Content-Type");
        expect(result[2]!.headers[1]!.value).toEqual("text/html");
    });
});
