import * as opentracing from 'opentracing';

function trace(tracer: opentracing.Tracer): MethodDecorator {


    const error = (span: opentracing.Span, e: Error) => {
        span.log({ error: e.message || 'unknown cause', stack: e.stack || 'unknown' })
        span.setTag(opentracing.Tags.ERROR, e.name);
    };

    return (target: Object, propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<any>): TypedPropertyDescriptor<any> | void => {

        try {
            if (descriptor === undefined) {
                descriptor = Object.getOwnPropertyDescriptor(target, propertyKey);
            }
            const source = descriptor.value;
            descriptor.value = (...args: any[]) => {
                const span = tracer.startSpan('method_execution');
                span.setOperationName(`method_${target.toString().toLowerCase()}_${String(propertyKey).toLowerCase()}`);
                try {
                    span.log({ event: 'method_start' });
                    const result = source.apply(this, args);
                    if (result && typeof result.then === 'function') {
                        span.setTag('method.promise', true);
                        return Promise.resolve(result)
                            .then(value => {
                                span.log({ event: 'method_end' });
                                span.finish();
                                return value;
                            })
                            .catch(e => {
                                error(span, e);
                                span.finish();
                            })
                    } else {
                        span.log({ event: 'method_end' });
                        return result;
                    }
                } catch (e) {
                    error(span, e);
                    span.finish();
                    throw e;
                }
            };
            return descriptor;
        } finally {

        }
    }
}

export default trace;