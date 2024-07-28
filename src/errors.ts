export class EdenFetchError<
    Status = number,
    Value extends any = any
> extends Error {
    value: Value
    constructor(
        public status: Status,
        public passedValue: Value
    ) {
        super(String((passedValue as any)?.message || passedValue))
        this.value = passedValue
    }
}
