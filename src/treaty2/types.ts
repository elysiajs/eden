/// <reference lib="dom" />
import type { Elysia } from 'elysia'
import { EdenWS } from './ws'
import type { IsNever, Not, Prettify } from '../types'

type Files = File | FileList

// type Replace<RecordType, TargetType, GenericType> = {
//     [K in keyof RecordType]: RecordType[K] extends TargetType
//         ? GenericType
//         : RecordType[K]
// }

type ReplaceBlobWithFiles<in out RecordType extends Record<string, unknown>> = {
	[K in keyof RecordType]: RecordType[K] extends Blob | Blob[]
		? Files
		: RecordType[K]
} & {}

type And<A extends boolean, B extends boolean> = A extends true
	? B extends true
		? true
		: false
	: false

type ReplaceGeneratorWithAsyncGenerator<
	in out RecordType extends Record<string, unknown>
> = {
	[K in keyof RecordType]: IsNever<RecordType[K]> extends true
		? RecordType[K]
		: RecordType[K] extends Generator<infer A, infer B, infer C>
			? void extends B
				? AsyncGenerator<A, B, C>
				: And<IsNever<A>, void extends B ? false : true> extends true
					? B
					: AsyncGenerator<A, B, C> | B
			: RecordType[K] extends AsyncGenerator<infer A, infer B, infer C>
				? And<
						Not<IsNever<A>>,
						void extends B ? true : false
					> extends true
					? AsyncGenerator<A, B, C>
					: And<
								IsNever<A>,
								void extends B ? false : true
						  > extends true
						? B
						: AsyncGenerator<A, B, C> | B
				: RecordType[K]
} & {}

type MaybeArray<T> = T | T[]
type MaybePromise<T> = T | Promise<T>

export namespace Treaty {
	interface TreatyParam {
		fetch?: RequestInit
	}

	export type Create<
		App extends Elysia<any, any, any, any, any, any, any>,
		ShouldThrow extends boolean
	> = App extends {
		_routes: infer Schema extends Record<string, any>
	}
		? Prettify<Sign<Schema, ShouldThrow>>
		: 'Please install Elysia before using Eden'

	export type Sign<in out Route extends Record<string, any>, ShouldThrow extends boolean> = {
		[K in keyof Route as K extends `:${string}`
			? never
			: K]: K extends 'subscribe' // ? Websocket route
			? (undefined extends Route['subscribe']['headers']
					? { headers?: Record<string, unknown> }
					: {
							headers: Route['subscribe']['headers']
						}) &
					(undefined extends Route['subscribe']['query']
						? { query?: Record<string, unknown> }
						: {
								query: Route['subscribe']['query']
							}) extends infer Param
				? {} extends Param
					? (options?: Param) => EdenWS<Route['subscribe']>
					: (options?: Param) => EdenWS<Route['subscribe']>
				: never
			: Route[K] extends {
						body: infer Body
						headers: infer Headers
						params: any
						query: infer Query
						response: infer Response extends Record<number, unknown>
				  }
				? (undefined extends Headers
						? { headers?: Record<string, unknown> }
						: {
								headers: Headers
							}) &
						(undefined extends Query
							? { query?: Record<string, unknown> }
							: { query: Query }) extends infer Param
					? {} extends Param
						? undefined extends Body
							? K extends 'get' | 'head'
								? (
										options?: Prettify<Param & TreatyParam>
									) => Promise<
										TreatyResponse<
											ReplaceGeneratorWithAsyncGenerator<Response>, ShouldThrow
										>
									>
								: (
										body?: Body,
										options?: Prettify<Param & TreatyParam>
									) => Promise<
										TreatyResponse<
											ReplaceGeneratorWithAsyncGenerator<Response>, ShouldThrow
										>
									>
							: (
									body: Body extends Record<string, unknown>
										? ReplaceBlobWithFiles<Body>
										: Body,
									options?: Prettify<Param & TreatyParam>
								) => Promise<
									TreatyResponse<
										ReplaceGeneratorWithAsyncGenerator<Response>, ShouldThrow
									>
								>
						: K extends 'get' | 'head'
							? (
									options: Prettify<Param & TreatyParam>
								) => Promise<
									TreatyResponse<
										ReplaceGeneratorWithAsyncGenerator<Response>, ShouldThrow
									>
								>
							: (
									body: Body extends Record<string, unknown>
										? ReplaceBlobWithFiles<Body>
										: Body,
									options: Prettify<Param & TreatyParam>
								) => Promise<
									TreatyResponse<
										ReplaceGeneratorWithAsyncGenerator<Response>, ShouldThrow
									>
								>
					: never
				: CreateParams<Route[K], ShouldThrow>
	}

	type CreateParams<Route extends Record<string, any>, ShouldThrow extends boolean> =
		Extract<keyof Route, `:${string}`> extends infer Path extends string
			? IsNever<Path> extends true
				? Prettify<Sign<Route, ShouldThrow>>
				: // ! DO NOT USE PRETTIFY ON THIS LINE, OTHERWISE FUNCTION CALLING WILL BE OMITTED
					(((params: {
						[param in Path extends `:${infer Param}`
							? Param extends `${infer Param}?`
								? Param
								: Param
							: never]: string | number
					}) => Prettify<Sign<Route[Path], ShouldThrow>> &
						CreateParams<Route[Path], ShouldThrow>) &
						Prettify<Sign<Route, ShouldThrow>>) &
						(Path extends `:${string}?`
							? CreateParams<Route[Path], ShouldThrow>
							: {})
			: never

	export interface Config<ShouldThrow extends boolean> {
		fetch?: Omit<RequestInit, 'headers' | 'method'>
		fetcher?: typeof fetch
		headers?: MaybeArray<
			| RequestInit['headers']
			| ((
					path: string,
					options: RequestInit
			  ) => RequestInit['headers'] | void)
		>
		onRequest?: MaybeArray<
			(
				path: string,
				options: FetchRequestInit
			) => MaybePromise<FetchRequestInit | void>
		>
		onResponse?: MaybeArray<(response: Response) => MaybePromise<unknown>>
		keepDomain?: boolean,
		/**
		 * If set to true the calls made by this client will throw an actual error and will not return a response object
		 * in case of an unsuccessful request.
		 * Setting this to true reduces the complexity in usage but increases hides away the details of the request.
		 * @default false
		 * 
		 * @example
		 * ```ts
		 * const userResult = await backend.auth["upsert-self"].post();
		 * if (userResult.error) {
		 *   throw userResult.error;
		 * }
		 * const user = userResult.data;
		 *
		 * // becomes
		 * const user = await backend.auth["upsert-self"].post();
		 * ```
		 */
		throw?: ShouldThrow
	}

	// type UnwrapAwaited<T extends Record<number, unknown>> = {
	//     [K in keyof T]: Awaited<T[K]>
	// }

	export type TreatyResponse<Res extends Record<number, unknown>, ShouldThrow extends boolean> = ShouldThrow extends false
	?
		| {
				data: Res[200]
				error: null
				response: Response
				status: number
				headers: FetchRequestInit['headers']
		  }
		| {
				data: null
				error: Exclude<keyof Res, 200> extends never
					? {
							status: unknown
							value: unknown
						}
					: {
							[Status in keyof Res]: {
								status: Status
								value: Res[Status]
							}
						}[Exclude<keyof Res, 200>]
				response: Response
				status: number
				headers: FetchRequestInit['headers']
		  } : Res[200]

	export interface OnMessage<Data = unknown> extends MessageEvent {
		data: Data
		rawData: MessageEvent['data']
	}

	export type WSEvent<
		K extends keyof WebSocketEventMap,
		Data = unknown
	> = K extends 'message' ? OnMessage<Data> : WebSocketEventMap[K]
}
