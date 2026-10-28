import { expectTypeOf } from 'expect-type'

import type { Treaty } from '../../src/treaty2'
import type { MapError } from '../../src/types'
import type { EdenFetchError } from '../../src/errors'
import type { EdenFetch } from '../../src/fetch/types'

type Data<R> = R extends { error: null; data: infer D } ? D : never
type Error<R> = R extends { data: null; error: infer E } ? E : never

// Elysia keys a body served at a status it only knows as `number`
// (`status(code as number, 'x')`, `problem({ status: n })`) as `default`.
// That status may be any: an error at some `number` status beside the known
// ones, or a 2xx read as `data`. Without it the error union would claim only
// the literal statuses while the server sends e.g. 418 'x'
{
	type Res = Treaty.TreatyResponse<{
		200: 'ok'
		401: 'no'
		default: 'x'
	}>

	expectTypeOf<Data<Res>>().toEqualTypeOf<'ok' | 'x'>()
	expectTypeOf<Error<Res>>().toEqualTypeOf<
		{ status: 401; value: 'no' } | { status: number; value: 'x' }
	>()
}

// only a `default`: still an error at some status, not `unknown`
{
	type Res = Treaty.TreatyResponse<{ 200: 'ok'; default: 'x' }>

	expectTypeOf<Error<Res>>().toEqualTypeOf<{ status: number; value: 'x' }>()
}

// unchanged without it
{
	type Res = Treaty.TreatyResponse<{ 200: 'ok'; 401: 'no' }>

	expectTypeOf<Data<Res>>().toEqualTypeOf<'ok'>()
	expectTypeOf<Error<Res>>().toEqualTypeOf<{ status: 401; value: 'no' }>()

	type Bare = Treaty.TreatyResponse<{ 200: 'ok' }>
	expectTypeOf<Error<Bare>>().toEqualTypeOf<{
		status: unknown
		value: unknown
	}>()
}

// Eden fetch and treaty 1 read it the same way
{
	expectTypeOf<MapError<{ 200: 'ok'; 401: 'no'; default: 'x' }>>().toEqualTypeOf<
		EdenFetchError<401, 'no'> | EdenFetchError<number, 'x'>
	>()
}

// A `default` multipart body is read as a plain object, as any other status's:
// `value.get('message')` doesn't type-check (Treaty never hands out FormData)
{
	type Form = FormData & { '~ely-form': { message: string } }
	type Res = Treaty.TreatyResponse<{ 200: 'ok'; default: Form | undefined }>

	expectTypeOf<Error<Res>>().toEqualTypeOf<{
		status: number
		value: { message: string } | ''
	}>()
}

// A body Elysia serves empty (`undefined`: 204, a handler returning nothing)
// is read as `''`, as Treaty parses an empty response
{
	type Res = Treaty.TreatyResponse<{ 200: 'x' | undefined; 204: undefined }>

	expectTypeOf<Data<Res>>().toEqualTypeOf<'x' | ''>()
}

// Eden Fetch reads a `default` 2xx as `data` too
{
	type Schema = {
		'/x': {
			get: {
				body: unknown
				params: {}
				query: unknown
				headers: unknown
				response: { 200: 'ok'; default: { kind: 'dynamic' } }
			}
		}
	}
	const fetcher = null! as EdenFetch.Fn<Schema>
	const call = () => fetcher('/x', {})
	type Result = Awaited<ReturnType<typeof call>>

	expectTypeOf<Data<Result>>().toEqualTypeOf<'ok' | { kind: 'dynamic' }>()
}
