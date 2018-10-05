import * as opentracing from 'opentracing';

import { DEFAULT_NAMESPACE, Namespace } from './namespace';
import { headersMetadataKey } from './headers';

export interface TraceOptions {
    namespace?: string;
    tags?: { [key: string]: string | number | boolean };
    baggage?: { [key: string]: string };
}

const advance = (tracer: opentracing.Tracer, namespace: Namespace, options: TraceOptions, target: any, propertyKey: string | symbol): opentracing.Span => {
    let spans = Array.isArray(namespace.ctx.spans) ? namespace.ctx.spans : [];
    const { baggage, tags } = options;
    const childOf = spans.slice(-1).pop();
    const span = tracer.startSpan('method_execution', {
        childOf,
        tags
    });

    if (baggage) {
        for (let [key, value] of Object.entries(baggage)) {
            span.setBaggageItem(key, value);
        }
    }
    span.setOperationName(`method_${target.toString().toLowerCase()}_${String(propertyKey).toLowerCase()}`);
    spans.push(span);
    namespace.ctx.spans = spans;
    return span;
};

const back = (spans: opentracing.Span[],
    namespace: any, ) => {
    spans.pop();
    namespace.ctx.spans = spans;
}

const error = (span: opentracing.Span,
    spans: opentracing.Span[],
    namespace: any,
    e: Error, ) => {
    span.setTag(opentracing.Tags.ERROR, true);
    span.log({ error: `${e.name} - ${e.message}`, stack: e.stack || 'unknown' });
    span.log({ event: 'method_end' });
    span.finish();
    back(spans, namespace);
};

const success = (span: opentracing.Span,
    spans: opentracing.Span[],
    namespace: any, ) => {
    span.log({ event: 'method_end' });
    span.finish();
    back(spans, namespace);
};

const injectHeaderParameters = (tracer: opentracing.Tracer,
    span: opentracing.Span,
    args: any[],
    target: Object,
    propertyKey: string | symbol, ) => {

    let headerParameters: number[] = Reflect.getOwnMetadata(headersMetadataKey, target, propertyKey);
    if (!Array.isArray(headerParameters)) {
        return;
    }
    let carrier = {};
    tracer.inject(span.context(), opentracing.FORMAT_HTTP_HEADERS, carrier);
    for (let parameterIndex of headerParameters) {
        args[parameterIndex] = Object.assign({}, args[parameterIndex], carrier);
    }
}

function trace(tracer: opentracing.Tracer,
    options: TraceOptions = { namespace: DEFAULT_NAMESPACE }, ): MethodDecorator {

    return (target: Object,
        propertyKey: string | symbol,
        descriptor: TypedPropertyDescriptor<any>, ): TypedPropertyDescriptor<any> | void => {

        if (descriptor === undefined) {
            descriptor = Object.getOwnPropertyDescriptor(target, propertyKey);
        }
        const namespace = Namespace.resolve(options.namespace);
        const source = descriptor.value;
        descriptor.value = (...args: any[]) => {

            const span = advance(tracer, namespace, options, target, propertyKey);
            const spans = namespace.ctx.spans;
            injectHeaderParameters(tracer, span, args, target, propertyKey);

            try {
                span.log({ event: 'method_start' });
                const result = source.apply(target, args);

                if (result && typeof result.then === 'function') {
                    span.setTag('method.promise', true);
                    return Promise.resolve(result)
                        .then(value => {
                            success(span, spans, namespace);
                            return value;
                        })
                        .catch(e => error(span, spans, namespace, e))
                } else {
                    span.setTag('method.promise', false);
                    success(span, spans, namespace);
                    return result;
                }
            } catch (e) {
                error(span, spans, namespace, e)
                throw e;
            }
        };
        return descriptor;
    }
}


export default trace;