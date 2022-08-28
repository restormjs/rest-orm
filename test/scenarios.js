const fs = require('fs')
const mock_date = '2021-04-01T20:01:02.123Z'

const tests = [{
  args: { m: 'GET', url: '/api/' },
  response: { status: 200, body: { '/': JSON.parse(fs.readFileSync('spec/product-api-spec.json')),
      'acc': JSON.parse(fs.readFileSync('spec/account-api-spec.json')),
      'play': JSON.parse(fs.readFileSync('spec/playground-api-spec.json'))} }

}, {
  args: { m: 'GET', url: '/api/acc/accounts?email=hello@example.com' },
  orm: { api: 'accounts', op: 'R', filters: [{ field: 'email', op: 'eq', val: 'hello@example.com' }] },
  pg: { sql: 'SELECT user_id as id, created_on, email, last_login, password, username FROM public.accounts WHERE email = $1 LIMIT 20 OFFSET 0', params: ['hello@example.com'], public: true },
  response: { status: 200, body: [{ id: 1, product_name: 'product1' }, { id: 2, product_name: 'product2' }] }
}, {
  args: { m: 'GET', url: '/api/products?price=1&product_name=product1&qty=gt=1&qty=lt=10&limit=10&offset=10' },
  response: { status: 400, body: { message: 'Query exceeded max allowed parameters number', status: 400, timestamp: '2021-04-01T20:01:02.123Z' } }
}, {
  args: { m: 'GET', url: '/api/products?price=1&product_name=product1&qty=gt=1&qty=lt=10&limit=10&offset=10' },
  response: { status: 400, body: { message: 'Query exceeded max allowed parameters number', status: 400, timestamp: '2021-04-01T20:01:02.123Z' } }
}, {
  args: { m: 'DELETE', url: '/api/transactions/1' },
  response: { status: 404, body: { message: 'Not Found', status: 404, timestamp: '2021-04-01T20:01:02.123Z' } }
}, {
  args: { m: 'GET', url: '/api/products?qty=gt=1&qty=lt=10' },
  orm: { api: 'products', op: 'R', filters: [{ field: 'qty', op: 'gt', val: '1' }, { field: 'qty', op: 'lt', val: '10' }] },
  pg: { sql: 'SELECT id, price, product_name, qty FROM public.product WHERE qty > $1 AND qty < $2 LIMIT 20 OFFSET 0', params: ['1', '10'] },
  response: { status: 200, body: { id: 1 } }
}, {
  args: { m: 'GET', url: '/api/products/1' },
  orm: { api: 'products', op: 'R', filters: [{ field: 'id', op: 'id', val: '1' }] },
  pg: { sql: 'SELECT id, price, product_name, qty FROM public.product WHERE id = $1 LIMIT 20 OFFSET 0', params: ['1'] },
  response: { status: 200, body: { id: 1, product_name: 'product1' } }
}, {
  args: { m: 'POST', url: '/api/products', payload: { id: 1, product_name: 'product1', price: 123.45, qty: 1 } },
  orm: { api: 'products', op: 'C', payload: { id: 1, product_name: 'product1', price: 123.45, qty: 1 } },
  pg: { sql: 'INSERT INTO public.product (product_name, price, qty) VALUES ($1, $2, $3) RETURNING id', params: ['product1', 123.45, 1] },
  response: { status: 200, body: { id: 3 } }
}, {
  args: { m: 'POST', url: '/api/products' },
  response: { status: 400, body: { message: 'json payload is required', status: 400, timestamp: '2021-04-01T20:01:02.123Z' } }
}, {
  args: { m: 'POST', url: '/api/products', payload: { id: 1, product_name: 'product1' } },
  response: { status: 400, body: { message: 'price is a required field', status: 400, timestamp: '2021-04-01T20:01:02.123Z' } }
}, {
  args: { m: 'PATCH', url: '/api/products/1', payload: { id: '1', product_name: 'product1' } },
  orm: { api: 'products', op: 'U', filters: [{ field: 'id', op: 'id', val: '1' }], payload: { id: '1', product_name: 'product1' } },
  pg: { sql: 'UPDATE public.product SET product_name = $1 WHERE id = $2', params: ['product1', '1'] },
  response: { status: 204 }
}, {
  args: { m: 'PATCH', url: '/api/products', payload: { id: '1', product_name: 'product1' } },
  response: { status: 400, body: { message: 'id is a required parameter', status: 400, timestamp: '2021-04-01T20:01:02.123Z' } }
}, {
  args: { m: 'PATCH', url: '/api/products/1' },
  response: { status: 400, body: { message: 'no data to update', status: 400, timestamp: '2021-04-01T20:01:02.123Z' } }
}, {
  args: { m: 'DELETE', url: '/api/products/1' },
  orm: { api: 'products', op: 'D', filters: [{ field: 'id', op: 'id', val: '1' }] },
  pg: { sql: 'DELETE FROM public.product WHERE id = $1', params: ['1'] },
  response: { status: 204 }
}, {
  args: { m: 'DELETE', url: '/api/products/1', payload: { product_name: 'product1' } },
  response: { status: 400, body: { message: 'no payload expected', status: 400, timestamp: '2021-04-01T20:01:02.123Z' } }
}, {
  args: { m: 'GET', url: '/api/something/' },
  response: { status: 404, body: { message: 'Not Found', status: 404, timestamp: mock_date } }
}, {
  args: { m: 'POST', url: '/api/something/' },
  response: { status: 404, body: { message: 'Not Found', status: 404, timestamp: mock_date } }
}, {
  args: { m: 'PATCH', url: '/api/something/' },
  response: { status: 404, body: { message: 'Not Found', status: 404, timestamp: mock_date } }
}, {
  args: { m: 'DELETE', url: '/api/something/' },
  response: { status: 404, body: { message: 'Not Found', status: 404, timestamp: mock_date } }
}, {
  args: { m: 'POST', url: '/api/products/1', payload: { id: 1, product_name: 'product1' } },
  response: { status: 400, body: { message: 'filter id is not supported by C operation', status: 400, timestamp: mock_date } }
}, {
  args: { m: 'PATCH', url: '/api/products/2', payload: { id: '1', product_name: 'product1' } },
  response: { status: 400, body: { message: 'parameter id should match payload', status: 400, timestamp: mock_date } }
}, {
  args: { m: 'DELETE', url: '/api/products' },
  response: { status: 400, body: { message: 'id is a required parameter', status: 400, timestamp: mock_date } }
}, {
  args: { m: 'DELETE', url: '/api/products/1?product_name=product1' },
  response: { status: 400, body: { message: 'filter eq is not supported by D operation', status: 400, timestamp: mock_date } }
}, {
  args: { m: 'GET', url: '/api/products?product_name=product1&qty=ne=north' },
  orm: { api: 'products', op: 'R', filters: [{ field: 'product_name', op: 'eq', val: 'product1' }, { field: 'qty', op: 'ne', val: 'north' }] },
  pg: { sql: 'SELECT id, price, product_name, qty FROM public.product WHERE product_name = $1 AND qty != $2 LIMIT 20 OFFSET 0', params: ['product1', 'north'] },
  response: { status: 200, body: [{ id: 1, product_name: 'product1' }, { id: 2, product_name: 'product2' }] }
}, {
  args: { m: 'GET', url: '/api/products?product_name=in=product1,product2&qty=gt=1' },
  orm: { api: 'products', op: 'R', filters: [{ field: 'product_name', op: 'in', val: ['product1', 'product2'] }, { field: 'qty', op: 'gt', val: '1' }] },
  pg: { sql: 'SELECT id, price, product_name, qty FROM public.product WHERE product_name IN ($1, $2) AND qty > $3 LIMIT 20 OFFSET 0', params: ['product1', 'product2', '1'] },
  response: { status: 200, body: [{ id: 1, product_name: 'product1' }, { id: 2, product_name: 'product2' }] }
}, {
  args: { m: 'GET', url: '/api/products?product_name=ge=2&qty=lt=1&order_desc=price,qty' },
  orm: { api: 'products', op: 'R', filters: [{ field: 'product_name', op: 'ge', val: '2' }, { field: 'qty', op: 'lt', val: '1' }, { op: 'order_desc', val: ['price', 'qty'] }] },
  pg: { sql: 'SELECT id, price, product_name, qty FROM public.product WHERE product_name >= $1 AND qty < $2 LIMIT 20 OFFSET 0 ORDER BY price DESC, qty DESC', params: ['2', '1'] },
  response: { status: 200, body: [] }
}, {
  args: { m: 'GET', url: '/api/products?product_name=le=2&qty=like=product&order_asc=product_name,price&offset=10&limit=30' },
  orm: { api: 'products', op: 'R', filters: [{ field: 'product_name', op: 'le', val: '2' }, { field: 'qty', op: 'like', val: 'product' }, { op: 'order_asc', val: ['product_name', 'price'] }, { op: 'offset', val: 10 }, { op: 'limit', val: 30 }] },
  pg: { sql: 'SELECT id, price, product_name, qty FROM public.product WHERE product_name <= $1 AND qty LIKE $2 LIMIT 30 OFFSET 10 ORDER BY product_name ASC, price ASC', params: ['2', '%product%'] },
  response: { status: 200, body: [{ id: 1, product_name: 'product1' }, { id: 2, product_name: 'product2' }] }
}, {
  args: { m: 'GET', url: '/api/products?product_name=le=2&qty=ilike=product&order_asc=product_name,price&offset=10&limit=30' },
  orm: { api: 'products', op: 'R', filters: [{ field: 'product_name', op: 'le', val: '2' }, { field: 'qty', op: 'ilike', val: 'product' }, { op: 'order_asc', val: ['product_name', 'price'] }, { op: 'offset', val: 10 }, { op: 'limit', val: 30 }] },
  pg: { sql: 'SELECT id, price, product_name, qty FROM public.product WHERE product_name <= $1 AND qty ILIKE $2 LIMIT 30 OFFSET 10 ORDER BY product_name ASC, price ASC', params: ['2', '%product%'] },
  response: { status: 200, body: [{ id: 1, product_name: 'product1' }, { id: 2, product_name: 'product2' }] }
}, {
  args: { m: 'GET', url: '/api/products?limit=300' },
  orm: { api: 'products', op: 'R', filters: [{ op: 'limit', val: 100 }] },
  pg: { sql: 'SELECT id, price, product_name, qty FROM public.product LIMIT 100 OFFSET 0', params: [] },
  response: { status: 200, body: [{ id: 1, product_name: 'product1' }, { id: 2, product_name: 'product2' }] }
}, {
  args: { m: 'GET', url: '/api/products?product_name=product1&limit=hacked' },
  response: { status: 400, body: { message: 'Expected positive number for limit', status: 400, timestamp: '2021-04-01T20:01:02.123Z' } }
}, {
  args: { m: 'GET', url: '/api/products?product_name=product1&offset=maybe' },
  response: { status: 400, body: { message: 'Expected positive number for offset', status: 400, timestamp: '2021-04-01T20:01:02.123Z' } }
}]

module.exports.tests = tests
module.exports.mock_date = mock_date
