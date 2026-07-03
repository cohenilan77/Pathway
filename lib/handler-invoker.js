export async function invokeHandler(handler, req) {
  let statusCode = 200;
  let payload;
  const headers = {};
  const res = {
    setHeader(name, value) { headers[name] = value; },
    status(code) { statusCode = code; return this; },
    json(value) { payload = value; return this; },
    send(value) { payload = value; return this; },
    end(value) { payload = value; return this; },
  };
  await handler(req, res);
  return { statusCode, payload, headers };
}
