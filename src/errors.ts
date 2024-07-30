export class EdenFetchError<
    Status = number,
    Value extends any = any
> extends Error {
    value: Value
    constructor(
        public status: Status,
        public passedValue: Value
    ) {
        let message = String((passedValue as any)?.message || '')
        if (!message) {
            if (typeof passedValue === 'object') {
                message = JSON.stringify(passedValue)
            } else {
                message = String(passedValue || '')
            }
        }
        super(message)
        this.value = passedValue
    }
}
