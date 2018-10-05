import * as http from 'http';
import * as opentracing from "opentracing";

import { Namespace } from './namespace';

const namespace = Namespace.resolve();


export function middleware(tracer: opentracing.Tracer) {
    return (req: http.IncomingMessage,
        res: http.ServerResponse,
        next?: Function, ) => {
        namespace.run(() => {
            const parentSpanContext = tracer.extract(opentracing.FORMAT_HTTP_HEADERS, req.headers);

            const span = tracer.startSpan('http_request', { childOf: parentSpanContext });
            namespace.ctx.spans = [span];

            span.setTag(opentracing.Tags.HTTP_METHOD, req.method);
            span.setTag(opentracing.Tags.HTTP_URL, (<any>req).route ? (<any>req).route.path : req.url);
            span.log({ event: 'request_start' });

            if (typeof next === 'function') {
                next();
            }
            res.on('finish', () => {
                span.setTag(opentracing.Tags.HTTP_STATUS_CODE, res.statusCode);
                if (res.statusCode >= 400) {
                    span.setTag(opentracing.Tags.ERROR, true);
                }
                span.log({ event: 'request_end' });
                span.finish();
            });
        });
    }
}

