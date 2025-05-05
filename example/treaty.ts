import { treaty } from '../src'
import type { Server } from './server'

const api = treaty<Server>('localhost:8080')

const { data, error } = await api.products.nendoroid.skadi.get({
	query: {
		filter: { name: 'skadi' }
	}
})

if (error)
	switch (error.status) {
		case 422:
			console.log(error.value.message)
			throw error
	}

console.log(data)
