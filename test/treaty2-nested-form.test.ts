import { treaty } from '@elysiajs/eden'
import { describe, expect, it } from 'bun:test'
import { Elysia, t } from 'elysia'

const productModel = t.Object({
    name: t.String(),
    variants: t.ArrayString(
        t.Object({
            price: t.Number({ minimum: 0 }),
            weight: t.Number({ minimum: 0 })
        })
    ),
    metadata: t.ObjectString({
        category: t.String(),
        tags: t.Array(t.String()),
        inStock: t.Boolean()
    }),
    image: t.File({ type: 'image' })
})
type productModel = typeof productModel.static

const app = new Elysia()
    .post('/product', ({ body, status }) => status("Created", body), { body: productModel })

const api = treaty(app)

describe('Nested FormData with file(s) support', () => {
    const filePath1 = `${import.meta.dir}/public/aris-yuzu.jpg`

    const testProduct: productModel = {
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
        image: Bun.file(filePath1)
    }

    it('should create a product using manual JSON.stringify (old way)', async () => {
        const stringifiedVariants = JSON.stringify(testProduct.variants)
        const stringifiedMetadata = JSON.stringify(testProduct.metadata)

        const { data, status } = await api.product.post({
            name: testProduct.name,
            variants: stringifiedVariants as unknown as {
                price: number
                weight: number
            }[],
            metadata: stringifiedMetadata as unknown as {
                category: string
                tags: string[]
                inStock: boolean
            },
            image: testProduct.image
        })

        expect(status).toBe(201)
        expect(data).toEqual(testProduct)
    })

    it('should auto-stringify ArrayString and ObjectString fields (new way - improved DX)', async () => {
        const { data, status } = await api.product.post({
            name: testProduct.name,
            variants: testProduct.variants, // No JSON.stringify needed!
            metadata: testProduct.metadata, // No JSON.stringify needed!
            image: testProduct.image
        })

        expect(status).toBe(201)
        expect(data).toEqual(testProduct)
    })
})
