import { describe, expect, it } from 'bun:test'
import { Elysia, t, type UnwrapSchema } from 'elysia'
import { treaty } from '../src'

const postProductModel = t.Object({
    name: t.String(),
    variants: t.Array(
        t.Object({
            price: t.Number({ minimum: 0 }),
            weight: t.Number({ minimum: 0 })
        })
    ),
    metadata: t.Object({
        category: t.String(),
        tags: t.Array(t.String()),
        inStock: t.Boolean()
    }),
    image: t.File()
})
type postProductModel = UnwrapSchema<typeof postProductModel>

const patchProductModel = t.Object({
    name: t.Optional(t.String()),
    variants: t.Optional(
        t.Array(
            t.Object({
                price: t.Number({ minimum: 0 }),
                weight: t.Number({ minimum: 0 })
            })
        )
    ),
    metadata: t.Optional(
        t.Object({
            category: t.String(),
            tags: t.Array(t.String()),
            inStock: t.Boolean()
        })
    ),
    image: t.Optional(t.File())
})

const app = new Elysia()
    .post(
        '/product',
        {
            body: postProductModel
        },
        async ({ body, status }) => status('Created', body)
    )
    .patch(
        '/product/:id',
        {
            body: patchProductModel
        },
        ({ body, params }) => ({
            id: params.id,
            ...body
        })
    )

const api = treaty(app)

describe('Nested FormData with file(s) support', () => {
    describe('Nested FormData with mandatory file (post operation)', async () => {
        const filePath1 = `${import.meta.dir}/public/aris-yuzu.jpg`
        // @types/node related File is not compatible with Bun.File
        // as unknown unneeded if you use only @types/bun
        const file = Bun.file(filePath1) as unknown as File

        const newProduct: postProductModel = {
            name: 'Test Product',
            variants: [
                {
                    price: 10,
                    weight: 100
                },
                {
                    price: 2.7,
                    weight: 32
                }
            ],
            metadata: {
                category: 'Electronics',
                tags: ['new', 'featured', 'sale'],
                inStock: true
            },
            image: file
        }

        it('should create a product using manual JSON.stringify (old way)', async () => {
            const stringifiedVariants = JSON.stringify(newProduct.variants)
            const stringifiedMetadata = JSON.stringify(newProduct.metadata)

            const { data, status } = await api.product.post({
                name: newProduct.name,
                variants: stringifiedVariants as unknown as {
                    price: number
                    weight: number
                }[],
                metadata: stringifiedMetadata as unknown as {
                    category: string
                    tags: string[]
                    inStock: boolean
                },
                image: newProduct.image
            })

            expect(status).toBe(201)
            expect(data).toEqual(newProduct)
        })

        it('should auto-stringify Array and Object fields (new way - improved DX)', async () => {
            const { data, status } = await api.product.post({
                name: newProduct.name,
                variants: newProduct.variants, // No JSON.stringify needed!
                metadata: newProduct.metadata, // No JSON.stringify needed!
                image: newProduct.image
            })

            expect(status).toBe(201)
            expect(data).toEqual(newProduct)
        })
    })

    describe('Nested FormData with optional file (patch operation)', () => {
        const filePath2 = `${import.meta.dir}/public/midori.png`

        it('PATCH with file and omitted optional t.Object', async () => {
            const { data, error, status } = await api
                .product({ id: '123' })
                .patch({
                    name: 'Updated Product',
                    image: Bun.file(filePath2) as any as File
                    // metadata and variants fields are omitted (should be OK since they're optional)
                })

            expect(error).toBeNull()
            expect(status).toBe(200)
            expect(data).not.toBeNull()
            expect(data?.name).toBe('Updated Product')
            expect(data?.metadata).toBeUndefined()
            expect(data?.variants).toBeUndefined()
        })

        it('PATCH with file and valid t.Object and t.Array data', async () => {
            const { data, error, status } = await api
                .product({ id: '123' })
                .patch({
                    name: 'Updated Product',
                    image: Bun.file(filePath2) as any as File,
                    metadata: {
                        category: 'Electronics',
                        tags: ['sale', 'new'],
                        inStock: true
                    },
                    variants: [
                        {
                            price: 15,
                            weight: 200
                        }
                    ]
                })

            expect(error).toBeNull()
            expect(status).toBe(200)
            expect(data).not.toBeNull()
            expect(data?.name).toBe('Updated Product')
            expect(data?.metadata).toEqual({
                category: 'Electronics',
                tags: ['sale', 'new'],
                inStock: true
            })
            expect(data?.variants).toEqual([
                {
                    price: 15,
                    weight: 200
                }
            ])
        })

        it('PATCH without file and omitted optional t.Object', async () => {
            const { data, error, status } = await api
                .product({ id: '123' })
                .patch({
                    name: 'Updated Product'
                    // No file, no metadata, no variants - should work fine (no FormData mode)
                })

            expect(error).toBeNull()
            expect(status).toBe(200)
            expect(data).not.toBeNull()
            expect(data?.name).toBe('Updated Product')
            expect(data?.image).toBeUndefined()
            expect(data?.metadata).toBeUndefined()
            expect(data?.variants).toBeUndefined()
        })
    })
})
