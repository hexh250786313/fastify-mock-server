import Fastify from 'fastify';
import proxy from '@fastify/http-proxy';
import multipart from '@fastify/multipart';
import zlib from 'zlib';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { parse } from 'jsonc-parser';
import queryString from 'querystring';
import dotenv from 'dotenv';

dotenv.config();

const target = process.env.TARGET_URL ?? 'https://example.com';
const port = process.env.PORT ?? '3000';

const server = Fastify({
    // logger: true,
});

/** When the flag exists in the mock data, the return result does not need to be encapsulated */
const flag = 'traceId';

/** default return body */
function getRes(data: any) {
    return {
        code: 0,
        success: true,
        data,
        msg: 'success',
        traceId: 'xxxyyy',
    };
}

// For parsing multipart/form-data e.g. file uploads
server.register(multipart);

server.register(proxy, {
    upstream: target,
    prefix: '/',
    rewritePrefix: '',
    http2: false,
    replyOptions: {
        rewriteRequestHeaders: (_originalReq, headers) => {
            return headers;
        },
        onResponse: (req, reply, res) => {
            const headers = reply.getHeaders();
            try {
                let originalBody = Buffer.from([]);
                res.on('data', (data) => {
                    originalBody = Buffer.concat([originalBody, data]);
                });

                res.on('error', (err: any) => {
                    console.log('Error', err);
                });

                res.on('end', async () => {
                    let newBody, bodyString;
                    let status = reply.statusCode;
                    let contentType = headers?.['content-type'] || '';
                    let modules: any[] = [];

                    // Traverse all json files in the ./apis directory in the outer layer directory
                    const path = join(__dirname, '../apis');

                    if (existsSync(path)) {
                        modules = readdirSync(path);
                    }

                    // Find the mock data corresponding to req.path
                    let mockData: any;
                    modules.find((module) => {
                        const jsonPath = join(__dirname, '../apis', module);
                        const fileContent = parse(readFileSync(jsonPath, 'utf8'));
                        const enabledMockApis = fileContent.enabled;
                        return enabledMockApis.find((path: string) => {
                            if (path === req.url) {
                                mockData = fileContent.mockData[path];
                                return true;
                            }
                            return false;
                        });
                    });

                    if (mockData !== undefined) {
                        status = 200;
                        contentType = 'application/json';
                        /** If responseStatus exists,
                         * replace responseBody with mockData
                         * and responseStatus with
                         * status */
                        if (mockData && typeof mockData.responseStatus === 'number') {
                            status = mockData.responseStatus;
                            mockData = mockData.responseBody;
                        } else if (
                            /** If there is a traceId, the default structure does not need to be encapsulated */
                            !(mockData && typeof mockData[flag] === 'string')
                        ) {
                            mockData = getRes(mockData);
                        }
                        // Replace the original response data with mock data
                        newBody = JSON.stringify(mockData);

                        newBody = zlib.gzipSync(newBody);
                        reply.header('Content-Encoding', 'gzip');
                    } else if (
                        typeof contentType !== 'number' &&
                        (contentType.includes('text') || contentType.includes('json'))
                    ) {
                        if (headers?.['content-encoding'] === 'gzip') {
                            bodyString = zlib.gunzipSync(originalBody).toString('utf8');
                        } else {
                            bodyString = originalBody.toString('utf8');
                        }
                        // Get the original response data
                        newBody = bodyString || '{}';

                        newBody = zlib.gzipSync(newBody);
                        reply.header('Content-Encoding', 'gzip');
                    } else {
                        newBody = originalBody;
                    }
                    reply.status(status).header('Content-Type', contentType).send(newBody);
                });
            } catch (err) {
                console.error('Error in processing response body', err);
                reply.status(500).send('Error in processing response body');
            }
        },
    },
});

server.addHook('onRequest', async (request, _reply) => {
    if (request.body && Object.keys(request.body).length) {
        let contentType = request.headers['content-type'];
        contentType = contentType ? contentType.toLowerCase() : '';

        if (contentType.includes('application/json')) {
            request.body = JSON.stringify(request.body);
        }

        if (contentType.includes('application/x-www-form-urlencoded')) {
            request.body = queryString.stringify(request.body as any);
        }
    }
});

const start = async () => {
    try {
        await server.listen({
            port: parseInt(port),
            host: '127.0.0.1',
        });
        server.log.info(`Server is running at http://localhost:${port}`);
    } catch (err) {
        server.log.error(err);
        process.exit(1);
    }
};

start();
