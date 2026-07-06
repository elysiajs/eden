export class EdenFetchError<
    Status extends number = number,
    Value = unknown
> extends Error {
    constructor(
        public status: Status,
        public value: Value
    ) {
        super(typeof value === 'object' ? JSON.stringify(value) : value + '')
    }
}
