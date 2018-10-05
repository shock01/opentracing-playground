
import * as express from "express";
import * as Prometheus from "prom-client";

import tracer from "./tracer";
import service from "./service";

import { middleware } from './tracing';
const app = express();

const httpRequestDurationMicroseconds = new Prometheus.Histogram({
    name: 'http_request_duration_ms',
    help: 'Duration of HTTP requests in ms',
    labelNames: ['route'],
    // buckets for response time from 0.1ms to 500ms
    buckets: [0.10, 5, 15, 50, 100, 200, 300, 400, 500]
});
app.use(middleware(tracer));
app.use((req, res, next) => {
    const start = Date.now();
    next();
    res.on('finish', () => {
        httpRequestDurationMicroseconds
            .labels(req.route ? req.route.path : req.path)
            .observe(Date.now() - start);

    });
});

app.get('/metrics', (req, res) => {
    res.set('Content-Type', Prometheus.register.contentType);
    res.end(Prometheus.register.metrics());
});

app.get('/', async (req, res) => {
    const content = await service.serviceMethod();
    res.end(content);
});

app.get('/throwing', async (req, res) => {
    await service.serviceMethod();
    await service.serviceMethod();

    try {
        await service.throwingMethod();
    } finally {
        res.end('Yeah Yeah');
    }
});

app.listen(8090, () => console.log('app is listening on port 8090'));