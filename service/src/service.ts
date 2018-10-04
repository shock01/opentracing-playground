import tracer from './tracer';
import trace from './trace';

export class Service {

    @trace(tracer)
    serviceMethod(): Promise<string> {
        return new Promise((resolve) => {
            setTimeout(() => resolve('Hello There!'), 500);
        });
    }

    @trace(tracer)
    throwingMethod(): Promise<string> {
        return new Promise((resolve, reject) => {
            setTimeout(() => reject(new Error('throwback!')), 500);
        });
    }

    toString() {
        return 'Service'
    }
}

export default new Service();