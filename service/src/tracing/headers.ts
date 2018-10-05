import "reflect-metadata";

export const headersMetadataKey = Symbol("required");

export function headers(target: any, propertyKey: string | symbol, parameterIndex: number) {
    let current: number[] = Reflect.getOwnMetadata(headersMetadataKey, target, propertyKey) || [];
    current.push(parameterIndex);
    Reflect.defineMetadata(headersMetadataKey, current, target, propertyKey);
};