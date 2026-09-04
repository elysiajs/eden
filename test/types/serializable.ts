import { expectTypeOf } from 'expect-type'
import type { Serializable } from '../../src/types'
import type { Serializable as ExportedSerializable } from '../../src'

class Money {
    constructor(public cents: number) {}

    toJSON(): { amount: number; currency: string } {
        return { amount: this.cents / 100, currency: 'USD' }
    }
}

{
    type Body = { amount: number; currency: string }

    expectTypeOf<Money>().toExtend<Serializable<Body>>()
    expectTypeOf<Body>().toExtend<Serializable<Body>>()
}

{
    type Body = { amount: number; currency: string }

    expectTypeOf<ExportedSerializable<Body>>().toEqualTypeOf<
        Serializable<Body>
    >()
}

{
    type Body = { price: { amount: number; currency: string }; at: string }

    const nested: Serializable<Body> = { price: new Money(100), at: new Date() }
}

{
    const date: Serializable<string> = new Date()
    const text: Serializable<string> = 'hello'
}

class Wrong {
    toJSON(): string {
        return 'x'
    }
}

{
    type Body = { amount: number; currency: string }

    const wrong = new Wrong()

    // @ts-expect-error
    const rejected: Serializable<Body> = wrong
}

{
    type Body = { amount: number; currency: string }

    const stray = { amount: 1, currency: 'USD', toJSON: () => 'x' }

    // @ts-expect-error
    const rejected: Serializable<Body> = stray
}

{
    expectTypeOf<Serializable<File>>().toEqualTypeOf<File>()
    expectTypeOf<Serializable<Blob>>().toEqualTypeOf<Blob>()
    expectTypeOf<Serializable<Date>>().toEqualTypeOf<Date>()

    const body: Serializable<{ file: File; blob: Blob; name: string }> = {
        file: new File([], 'a'),
        blob: new Blob([]),
        name: 'a'
    }
}

{
    expectTypeOf<Serializable<unknown>>().toEqualTypeOf<unknown>()
    expectTypeOf<Serializable<any>>().toBeAny()
}

{
    type Body = { amount: number; currency: string }

    const asNull: Serializable<Body | null | undefined> = null
    const asUndefined: Serializable<Body | null | undefined> = undefined
    const asMoney: Serializable<Body | null | undefined> = new Money(100)
    const asObject: Serializable<Body | null | undefined> = {
        amount: 1,
        currency: 'USD'
    }

    const literalA: Serializable<'a' | 'b'> = 'a'
    const literalB: Serializable<'a' | 'b'> = 'b'

    expectTypeOf(asUndefined).toExtend<Serializable<Body | null | undefined>>()
    expectTypeOf(asObject).toExtend<Serializable<Body | null | undefined>>()
    expectTypeOf(literalB).toExtend<Serializable<'a' | 'b'>>()
}

class MoneyList {
    toJSON(): { amount: number; currency: string }[] {
        return []
    }
}

{
    type Body = { amount: number; currency: string }

    const elementWise: Serializable<Body[]> = [
        new Money(100),
        { amount: 1, currency: 'USD' }
    ]
    const wholeArray: Serializable<Body[]> = new MoneyList()
    const dates: Serializable<string[]> = [new Date()]

    expectTypeOf(wholeArray).toExtend<Serializable<Body[]>>()
}

class Cents {
    toJSON(): number {
        return 7
    }
}

class Order {
    toJSON(): { price: Cents } {
        return { price: new Cents() }
    }
}

class DoubleWrapped {
    toJSON(): Money {
        return new Money(100)
    }
}

{
    type Body = { price: number }

    const nestedResult: Serializable<Body> = new Order()

    const doubleWrapped = new DoubleWrapped()

    // @ts-expect-error
    const rejected: Serializable<{ amount: number; currency: string }> = doubleWrapped
}

{
    type Body = { toJSON: string; amount: number }

    const named: Serializable<Body> = { toJSON: 'value', amount: 1 }

    const callable = { toJSON: () => 'value', amount: 1 }

    // @ts-expect-error
    const rejected: Serializable<Body> = callable
}
