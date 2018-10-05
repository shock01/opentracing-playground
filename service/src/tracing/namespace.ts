import * as async_hooks from "async_hooks";


export interface Run {
    (namespace?: Namespace): void;
}
export const DEFAULT_NAMESPACE = 'default';
const registry: Map<string, Namespace> = new Map();

export class Namespace {

    private asyncHook: async_hooks.AsyncHook;

    constructor(readonly name: string,
        protected context: Map<number, any> = new Map()) {
    }

    run(callback: Run) {
        const eid = async_hooks.executionAsyncId();
        this.context.set(eid, {});
        callback();
    }

    get ctx(): any {
        const namespace = this;
        return new Proxy({}, {
            get(target: any, p: PropertyKey, receiver: any): any {
                const eid = async_hooks.executionAsyncId();
                if (!namespace.context.has(eid)) {
                    return undefined;
                }
                return namespace.context.get(eid)[p];
            },
            set(target: any, p: PropertyKey, value: any, receiver: any): boolean {
                const eid = async_hooks.executionAsyncId();
                if (!namespace.context.has(eid)) {
                    namespace.context.set(eid, {});
                }
                namespace.context.get(eid)[p] = value;
                return true;
            }
        });
    }

    protected setup() {
        this.asyncHook = async_hooks.createHook({
            init: this.hookInit.bind(this),
            destroy: this.hookDestroy.bind(this)
        });
        this.asyncHook.enable();
    }

    private hookInit(asyncId: number, type: string, triggerAsyncId: number, resource: Object) {

        if (this.context.has(triggerAsyncId)) {
            this.context.set(asyncId, this.context.get(triggerAsyncId));
        }
    }

    private hookDestroy(asyncId: number) {
        this.context.delete(asyncId);
    }

    dispose() {
        this.asyncHook.disable();
        this.asyncHook = null;
    }

    get [Symbol.toStringTag]() {
        return "Namespace";
    }

    static create(name: string = DEFAULT_NAMESPACE): Namespace {
        if (registry.has(name)) {
            throw new Error(`namespace with name ${name} already exists`);
        }
        const instance = new Namespace(name);
        instance.setup();
        registry.set(name, instance);
        return instance;
    }

    static resolve(name: string = DEFAULT_NAMESPACE): Namespace {
        return registry.get(name);
    }
}
// create the default namespace
export default Namespace.create();
