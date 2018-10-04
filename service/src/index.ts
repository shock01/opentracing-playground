
import * as express from "express";
import * as opentracing from "opentracing";
import * as Prometheus from "prom-client";

import tracer from "./tracer";
import service from "./service";

const app = express();

const httpRequestDurationMicroseconds = new Prometheus.Histogram({
    name: 'http_request_duration_ms',
    help: 'Duration of HTTP requests in ms',
    labelNames: ['route'],
    // buckets for response time from 0.1ms to 500ms
    buckets: [0.10, 5, 15, 50, 100, 200, 300, 400, 500]
});
app.use((req, res, next) => {
    const span = tracer.startSpan('http_request');

    span.setTag(opentracing.Tags.HTTP_METHOD, req.method);
    span.setTag(opentracing.Tags.HTTP_URL, req.path);
    span.log({ event: 'request_start' });

    const start = Date.now();
    (<any>req).tracing = { span };
    next();

    res.on('finish', () => {
        httpRequestDurationMicroseconds
            .labels(req.route ? req.route.path : req.path)
            .observe(Date.now() - start);
        span.log({ event: 'request_end' });
        span.finish();
    });
});

app.get('/metrics', (req, res) => {
    res.set('Content-Type', Prometheus.register.contentType);
    res.end(Prometheus.register.metrics());
});

app.get('/', async (req, res) => {
    const span = tracer.startSpan('handler', { childOf: (<any>req).tracing.span });
    span.log({ event: 'handler_start' });
    const content = await service.serviceMethod();
    span.log({ event: 'handler_finish' });
    span.finish();
    res.end(content);
});

app.get('/throwing', async (req, res) => {
    try {
        await service.throwingMethod();
    } finally {
        res.end('Yeah Yeah');
    }

});

app.listen(8090, () => console.log('app is listening on port 8090'));