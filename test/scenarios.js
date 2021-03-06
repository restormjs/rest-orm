
const mock_date = '2021-04-01T20:01:02.123Z'

const tests = [ {
    args: { m: 'GET', url: '/api/accounts/1' },
    orm: { api: 'accounts', op: 'R', filters: [{"field": "id", "op": "id", "val": "1"}] },
    pg: {sql: 'SELECT account_id as id, created_on as created_on, name as name, last_login as last_login, password as password, username as username FROM public.accounts WHERE account_id = $1 LIMIT 20 OFFSET 0', params: ['1']},
    response: {status: 200, body: {id: 1, name: 'account1'}}
}, {
    args: { m: 'POST', url: '/api/accounts', payload: {id: 1, name: 'account1'} },
    orm: { api: 'accounts', op: 'C', payload: {id: 1, name: 'account1'} },
    pg: {sql: 'INSERT INTO public.accounts (name) VALUES ($1) RETURNING account_id AS id', params: ['account1']},
    response: {status: 200, body: {id: 3}}
}, {
    args: { m: 'PATCH', url: '/api/accounts/1', payload: {id: "1", name: 'account1'} },
    orm: { api: 'accounts', op: 'U', filters: [{"field": "id", "op": "id", "val": "1"}], payload: {id: "1", name: 'account1'} },
    pg: {sql: 'UPDATE public.accounts SET name = $1 WHERE account_id = $2', params: ['account1', '1']},
    response: {status: 204}
}, {
    args: { m: 'DELETE', url: '/api/accounts/1'},
    orm: { api: 'accounts', op: 'D', filters: [{"field": "id", "op": "id", "val": "1"}] },
    pg: {sql: 'DELETE FROM public.accounts WHERE account_id = $1', params:['1']},
    response: {status: 204}
}, {
    args: { m: 'GET', url: '/api/something/' },
    response: {status: 404, body: { message: 'Not Found', 'status': 404, timestamp: mock_date}}
}, {
    args: { m: 'POST', url: '/api/something/' },
    response: {status: 404, body: { message: 'Not Found', 'status': 404, timestamp: mock_date}}
}, {
    args: { m: 'PATCH', url: '/api/something/' },
    response: {status: 404, body: { message: 'Not Found', 'status': 404, timestamp: mock_date}}
}, {
    args: { m: 'DELETE', url: '/api/something/' },
    response: {status: 404, body: { message: 'Not Found', 'status': 404, timestamp: mock_date}}
}, {
    args: { m: 'POST', url: '/api/accounts/1', payload: {id: 1, name: 'account1'} },
    response: {status: 400, body: { message: 'filter id is not supported by C operation', 'status': 400, timestamp: mock_date}}
}, {
    args: { m: 'PATCH', url: '/api/accounts/2', payload: {id: "1", name: 'account1'} },
    response: {status: 400, body: { message: 'parameter id should match payload', 'status': 400, timestamp: mock_date}}
}, {
    args: { m: 'DELETE', url: '/api/accounts'},
    response: {status: 400, body: { message: 'id is a required parameter', 'status': 400, timestamp: mock_date}}
}, {
    args: { m: 'DELETE', url: '/api/accounts/1?name=account1'},
    response: {status: 400, body: { message: 'filter eq is not supported by D operation', 'status': 400, timestamp: mock_date}}
},

];

module.exports.tests = tests
module.exports.mock_date = mock_date
