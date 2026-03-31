/// <reference lib="dom" />
import type { Elysia, ELYSIA_FORM_DATA } from 'elysia'

import type { EdenWS } from './ws'
import type {
	IsNever,
	MaybeEmptyObject,
	Not,
	Prettify,
	ThrowHttpError
} from '../types'

// type Files = File | FileList

// type Replace<RecordType, TargetType, GenericType> = {
//     [K in keyof RecordType]: RecordType[K] extends TargetType
//         ? GenericType
//         : RecordType[K]
// }

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
				: RecordType[K] extends ReadableStream<infer A>
					? AsyncGenerator<A, void, unknown>
					: RecordType[K]
} & {}

type SuccessCodes = 200 | 201 | 202 | 203 | 204 | 205 | 206 | 207 | 208 | 226

type MaybeArray<T> = T | T[]

type MaybeArrayFile<T> = T extends File[]
	? File[] | File
	: T extends File
		? File
		: T

type RelaxFileArrays<T> =
	T extends Record<string, unknown>
		? {
				[K in keyof T]: MaybeArrayFile<T[K]>
			}
		: T

type SerializeQueryParams<T> =
	T extends Record<string, any>
		? {
				[K in keyof T]: T[K] extends Date
					? string | Date
					: T[K] extends Date | undefined
						? string | Date | undefined
						: T[K]
			}
		: T

export namespace Treaty {
	export interface TreatyParam {
		fetch?: RequestInit
		throwHttpError?: ThrowHttpError
	}

	export type Create<
		App extends Elysia<any, any, any, any, any, any, any>,
		Head extends Record<string, unknown> = {}
	> = App extends {
		'~Routes': infer Schema extends Record<any, any>
	}
		? Prettify<Sign<Schema, Head>> & CreateParams<Schema, Head>
		: 'Please install Elysia before using Eden'

	type ToTreatyParam<Target, Head extends Record<string, unknown>> = Prettify<
		TreatyParam &
			({} extends Head
				? Target
				: // @ts-ignore
					Omit<Target['headers'], keyof Head> &
							Partial<Head> extends infer Head
					? {} extends Head
						? { headers?: Head } & Omit<Target, 'headers'>
						: { headers: Head } & Omit<Target, 'headers'>
					: Target)
	>

	export type Sign<
		in out Route extends Record<any, any>,
		in out Head extends Record<string, unknown> = {}
	> = {
		[K in keyof Route as K extends `:${string}`
			? never
			: K]: K extends 'subscribe' // ? Websocket route
			? MaybeEmptyObject<Route['subscribe']['headers'], 'headers'> &
					MaybeEmptyObject<
						SerializeQueryParams<Route['subscribe']['query']>,
						'query'
					> extends infer Param
				? (options?: Param) => EdenWS<Route['subscribe']>
				: never
			: (Route[K] extends {
					body: infer Body
					headers: infer Headers
					params: any
					query: infer Query
					response: infer Res extends Record<number, unknown>
				}
					? MaybeEmptyObject<Headers, 'headers'> &
							MaybeEmptyObject<
								SerializeQueryParams<Query>,
								'query'
							> extends infer Param
						? {} extends Param
							? undefined extends Body
								? K extends 'get' | 'head'
									? (
											options?: ToTreatyParam<Param, Head>
										) => Promise<
											TreatyResponse<
												ReplaceGeneratorWithAsyncGenerator<Res>
											>
										>
									: (
											body?: RelaxFileArrays<Body>,
											options?: ToTreatyParam<Param, Head>
										) => Promise<
											TreatyResponse<
												ReplaceGeneratorWithAsyncGenerator<Res>
											>
										>
								: K extends 'get' | 'head'
									? (
											options?: ToTreatyParam<Param, Head>
										) => Promise<
											TreatyResponse<
												ReplaceGeneratorWithAsyncGenerator<Res>
											>
										>
									: {} extends Body
										? (
												body?: RelaxFileArrays<Body>,
												options?: ToTreatyParam<
													Param,
													Head
												>
											) => Promise<
												TreatyResponse<
													ReplaceGeneratorWithAsyncGenerator<Res>
												>
											>
										: (
												body: RelaxFileArrays<Body>,
												options?: ToTreatyParam<
													Param,
													Head
												>
											) => Promise<
												TreatyResponse<
													ReplaceGeneratorWithAsyncGenerator<Res>
												>
											>
							: K extends 'get' | 'head'
								? (
										options: ToTreatyParam<Param, Head>
									) => Promise<
										TreatyResponse<
											ReplaceGeneratorWithAsyncGenerator<Res>
										>
									>
								: (
										body: RelaxFileArrays<Body>,
										options: ToTreatyParam<Param, Head>
									) => Promise<
										TreatyResponse<
											ReplaceGeneratorWithAsyncGenerator<Res>
										>
									>
						: never
					: CreateParams<Route[K], Head>) & {
					'~path': string
				}
	}

	type CreateParams<
		Route extends Record<string, any>,
		Head extends Record<string, unknown> = {}
	> =
		Extract<keyof Route, `:${string}`> extends infer Path extends string
			? IsNever<Path> extends true
				? Prettify<Sign<Route, Head>>
				: // ! DO NOT USE PRETTIFY ON THIS LINE, OTHERWISE FUNCTION CALLING WILL BE OMITTED
					(((params: {
						[param in Path extends `:${infer Param}`
							? Param extends `${infer Param}?`
								? Param
								: Param
							: never]: string | number
					}) => Prettify<
						Sign<Route[Path], Head> & {
							'~path': string
						}
					> &
						CreateParams<Route[Path], Head>) &
						Prettify<Sign<Route, Head>>) &
						(Path extends `:${string}?`
							? CreateParams<Route[Path], Head>
							: {})
			: never

	export interface Config<Head extends {} = {}> {
		fetch?: Omit<RequestInit, 'headers' | 'method'>
		fetcher?: typeof fetch
		headers?: MaybeArray<
			| Head
			| RequestInit['headers']
			| ((
					path: string,
					options: RequestInit
			  ) => MaybePromise<Head | RequestInit['headers'] | void>)
		>
		onRequest?: MaybeArray<
			(
				path: string,
				options: RequestInit
			) => MaybePromise<RequestInit | void>
		>
		onResponse?: MaybeArray<(response: Response) => MaybePromise<unknown>>
		keepDomain?: boolean
		/**
		 * @default true
		 *
		 * parse stringifed Date to new Date
		 */
		parseDate?: boolean
		/**
		 *
		 */
		throwHttpError?: ThrowHttpError
	}

	// type UnwrapAwaited<T extends Record<number, unknown>> = {
	//     [K in keyof T]: Awaited<T[K]>
	// }

	export type TreatyResponse<Res extends Record<number, unknown>> =
		| {
				data: Res[Extract<keyof Res, SuccessCodes>] extends {
					[ELYSIA_FORM_DATA]: infer Data
				}
					? Data
					: Res[Extract<keyof Res, SuccessCodes>]
				error: null
				response: Response
				status: number
				headers: ResponseInit['headers']
		  }
		| {
				data: null
				error: Exclude<keyof Res, SuccessCodes> extends never
					? {
							status: unknown
							value: unknown
						}
					: {
							[Status in keyof Res]: {
								status: Status
								value: Res[Status] extends {
									[ELYSIA_FORM_DATA]: infer Data
								}
									? Data
									: Res[Status]
							}
						}[Exclude<keyof Res, SuccessCodes>]
				response: Response
				status: number
				headers: ResponseInit['headers']
		  }

	export interface OnMessage<Data = unknown> extends MessageEvent {
		data: Data
		rawData: MessageEvent['data']
	}

	export type WSEvent<
		K extends keyof WebSocketEventMap,
		Data = unknown
	> = K extends 'message' ? OnMessage<Data> : WebSocketEventMap[K]

	type MaybeFunction<T> = T | ((...a: any) => T)
	type UnwrapMaybeFunction<T> = T extends (...a: any) => infer R ? R : T

	type MaybePromise<T> = T | Promise<T>

	export type Data<
		Response extends MaybeFunction<MaybePromise<Treaty.TreatyResponse<{}>>>
	> = NonNullable<Awaited<UnwrapMaybeFunction<Response>>['data']>

	export type Error<
		Response extends MaybeFunction<MaybePromise<Treaty.TreatyResponse<{}>>>
	> = NonNullable<Awaited<UnwrapMaybeFunction<Response>>['error']>
}
