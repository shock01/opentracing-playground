import tracer from './tracer';
import trace, { headers } from './tracing';

export class Service {

    @trace(tracer, { tags: { 'stupid': true } })
    serviceMethod(): Promise<string> {

        return new Promise((resolve) => {
            this.test().then(() => {
                setTimeout(() => resolve('Hello There!'), 500);
            });
        });
    }

    @trace(tracer, { baggage: { 'transaction': 'throwing' } })
    throwingMethod(): Promise<string> {
        return new Promise((resolve, reject) => {
            setTimeout(() => reject(new Error('throwback!')), 500);
        });
    }

    @trace(tracer)
    async test(@headers headers: any = {}) {
        console.log('headers', headers)
        return 'yueah';
    }

    /**
     * https://www.keithcirkel.co.uk/metaprogramming-in-es6-symbols/
     */
    get [Symbol.toStringTag]() {
        return "Service";
    }
}

export default new Service();