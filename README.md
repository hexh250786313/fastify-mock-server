# fastify-mock-server

This is a mock server, which can simulate the interface return data by simply modifying the json file. Powered by [fastify](https://www.fastify.io/).

## Usage

```bash
git clone https://github.com/hexh250786313/fastify-mock-server
cd fastify-mock-server
npm ci
npm run start
```

```bash
curl http://localhost:2999/posts/1 # will return mock data from ./apis/apis-1.jsonc
curl http://localhost:2999/posts/2 # will return real data from target server
curl http://localhost:2999/posts/4 # will return real data from ./apis/apis-xxyyz.jsonc
```

If there is no mock data configured in `./apis` and the path is configured in the `"enabled"` field, the real interface will be requested directly.

You can configure the port number and target server address in the `.env` file.

## Configuration

```json
{
    "enabled": ["/posts/1"], // Only the path in the enabled field will be mocked
    "example": ["/posts/1", "/posts/2", "/posts/3"], // Just record the path, no actual effect
    "mockData": {
        // Directly define data, the mock service automatically adds code, success, msg, traceId
        // It is actual the "data" part of the response body (like the "data" in the "/posts/2" example below), other parts are added automatically
        // You can modify the getRes function in src/index.ts to change this structure
        "/posts/1": {
            "res": "hello, world"
        },
        // Define all return data by yourself
        // By default, "traceId" is used as the identifier. When "traceId" exists, the default structure will not be added automatically.
        // You can modify the flag identifier in src/index.ts
        "/posts/2": {
            "code": 0,
            "success": true,
            "data": {
                "res": "hello, world"
            },
            "msg": "success",
            "traceId": "2d89e7fe1a5446e999df82c712ac6c0e.902.16951913902842587"
        },
        // Define all data including response status code
        "/posts/3": {
            "responseStatus": 200,
            "responseBody": {
                "code": 0,
                "success": true,
                "data": {
                    "res": "hello, world"
                },
                "msg": "success",
                "traceId": "2d89e7fe1a5446e999df82c712ac6c0e.902.16951913902842587"
            }
        }
    }
}
```

## License

[Anti 996](https://github.com/hexh250786313/fastify-mock-server/blob/master/LICENSE)
