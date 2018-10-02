import tracer from "./tracer";
import * as express from "express";
import * as opentracing from "opentracing";
import * as Prometheus from "prom-client";
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
    if (/^\/metrics/.test(req.path)) {
        next();
    } else {
        const start = Date.now();
        next();
        httpRequestDurationMicroseconds
            .labels(req.route ? req.route.path : req.path)
            .observe(Date.now() - start);
    }
    span.log({ event: 'request_end' });
    span.finish();
});

app.get('/metrics', (req, res) => {
    res.set('Content-Type', Prometheus.register.contentType);
    res.end(Prometheus.register.metrics());
});

app.get('/', (req, res) => {
    res.end('hello');
});

app.listen(8090, () => console.log('app is listening on port 8090'));