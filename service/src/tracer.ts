import * as opentracing from "opentracing";
import * as Prometheus from "prom-client";

//const tracer = new opentracing.Tracer();
const { initTracer, PrometheusMetricsFactory } = require('jaeger-client');

const serviceName = process.env.SERVICE_NAME || 'service';
const version = process.env.VERSION || '1.0';

var config = {
    serviceName,
    reporter: {
        logSpans: true,
        agentHost: 'localhost',
        agentPort: 6832
    },
    sampler: {
        type: 'probabilistic',
        param: 1.0
    },
};
var namespace = config.serviceName;

var metrics = new PrometheusMetricsFactory(Prometheus, namespace);

var options = {
    tags: {
        [`${serviceName}.version`]: version,
    },
    metrics,
    logger: {
        info(msg: string) {
            console.log(msg);
        },
        error(msg: string) {
            console.error(msg);
        },

    }
};
var tracer = initTracer(config, options);


export default tracer as opentracing.Tracer;
