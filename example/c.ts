import { edenTreaty } from '../src'
// import type { Inventory } from 'inventory'

// const eden = edenTreaty<Inventory>('https://cafe.gehenna.sh')
const eden = edenTreaty<any>('http://localhost:8080')

const main = async () => {
    // ? It's wise to start from index
    // @ts-ignore
    const path = eden.prism.put({
        image: Bun.file('./example/grace.webp'),
        $fetch: {
            headers: {
                cookie: 'status=Existential Fantasy'
            }
        }
    })

    path.then(console.log)
}

main()
