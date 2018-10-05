# Typescript Opentracking decorations

## @trace

## @headers

```
    @trace(tracer, {baggage: {'key', 'value}, tags: {'key', 'value'}})
    async test(@headers headers: any = {}) {
        return true;
    }
```