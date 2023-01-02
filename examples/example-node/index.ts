import http from 'http';
import file from 'fs/promises';
import { readForm, writeFormData } from './util';
import path from 'path';

const handlers: Record<string, http.RequestListener<typeof http.IncomingMessage, typeof http.ServerResponse>> = {
  "/": (req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.writeHead(200);
    res.end(`
      <!doctype html>
      <html>
        <head>
          <script src="/script.js"></script>
        </head>
        <body>
          <button id="button">Test</button>
          <div id="log" style="white-space: pre;"></div>
          <script type="application/javascript">
            zerodepsMultipartParser.polyfill_minimum();

            function assert(condition, message) {
                if (!condition) {
                    throw new Error(message);
                }
            }

            function generateArrayBuffer(length) {
                var content = new ArrayBuffer(length);
                var array = new Uint8Array(content);

                for (let i = 0; i < array.byteLength; ++i) {
                    array.set(i, Math.floor(Math.random() * 255));
                }

                return content;
            }

            function doLog(parts, color) {
              var ele = document.getElementById('log');
              var holder = document.createElement('div');
              ele.appendChild(holder);

              if (color) {
                holder.style.color = color;
              }
              for (var i = 0; i < parts.length; ++i) {
                holder.appendChild(document.createTextNode(parts[i]))
              }
            }

            function log() {
              doLog(arguments);
            }

            function warn() {
              doLog(arguments, 'red');
            }

            function runTest() {
              document.getElementById('log').innerHTML = '';
              
              var inputString = 'The quick brown fox jumped over the lazy dog. Σὲ γνωρίζω ἀπὸ τὴν κόψη';
              var inputArray = generateArrayBuffer(1024);

              Promise.resolve()
                .then(function() {
                  var builder = new zerodepsMultipartParser.MultipartBuilder();
                  builder.add({ 
                    data: inputString,
                    name: 'test1',
                    filename: 'test1.txt'
                  });
                  builder.add({ 
                      data: inputArray,
                      name: 'test2',
                      filename: 'test2.bin'
                  });
                  return builder.build();
                })
                .then(
                  function(content) {
                    var client = new zerodepsMultipartParser.HttpClient();
                    return client.request({
                      url: '/echo',
                      method: 'POST',
                      content: content
                    });
                  }
                )
                .then(
                  function(response) {
                    if (!zerodepsMultipartParser.isMultipartContent(response.content)) {
                        throw new Error('Unexpected multipart data.');
                    }

                    log(response.status);

                    var entries = response.content.entries();

                    var isSamePromise1 = zerodepsMultipartParser.Data.isSame(entries[0].data, new zerodepsMultipartParser.Data(inputString));
                    var isSamePromise2 = zerodepsMultipartParser.Data.isSame(entries[1].data, new zerodepsMultipartParser.Data(inputArray));

                    return Promise.all([
                      response,
                      isSamePromise1,
                      isSamePromise2
                    ]);
                  }
                )
                .then(
                  function(resolved) {
                    var response = resolved[0];
                    var isSame1 = resolved[1];
                    var isSame2 = resolved[2];

                    assert(response.content.parts.length === 2, 'Found ' + response.content.parts.length + ' when expecting 2.');

                    var entries = response.content.entries();

                    assert(entries[0].name == 'test1', 'Incorrect content-disposition on part 0 - ' + entries[0].name);
                    assert(isSame1, 'Mismatched content in part 0');

                    assert(entries[1].name == 'test2', 'Incorrect content-disposition on part 1 - ' + entries[1].name);
                    assert(isSame2, 'Mismatched content in part 1');
                  }
                )
                .then(
                  undefined,
                  function(err) {
                    warn(err);
                  }
                );
              }
            document.getElementById('button').addEventListener('click', runTest);
          </script>
        </body>
      </html>
    `);
  },
  "/script.js": async (req, res) => {
    const filename = require.resolve('@captainpants/zerodeps-multipart-parser/umd.js');
    const content = await file.readFile(filename);
    res.setHeader('Content-Type', 'text/javascript');
    res.writeHead(200);
    res.end(content);
  },
  "/echo": async (req, res) => {
    const parts = await readForm(req);

    await writeFormData(res, parts);

    res.end();
  }
};

const requestListener = function (req: http.IncomingMessage, res: http.ServerResponse) {
  const path = req.url ?? "/";
  const handler = handlers[path];

  console.log(`${req.method} ${req.url}`);

  if (!handler) {
    res.writeHead(404);
    res.end();
    return;
  }

  return handler(req, res);
}

console.log('Listening at http://localhost:3001. Ctrl+C to end.');
const server = http.createServer(requestListener);
server.listen(3001);