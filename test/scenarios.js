
const mock_date = '2021-04-01T20:01:02.123Z'

const tests = [ {
    args: { m: 'GET', url: '/api/accounts/1' },
    orm: { api: 'accounts', op: 'R', filters: [{"field": "id", "op": "id", "val": "1"}] },
    pg: {sql: 'SELECT account_id as id, created_on, name, last_login, location FROM public.accounts WHERE account_id = $1 LIMIT 20 OFFSET 0', params: ['1']},
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
}, {
    args: { m: 'GET', url: '/api/accounts?name=account1&location=ne=north'},
    orm: { api: 'accounts', op: 'R', filters: [{"field": "name", "op": "eq", "val": "account1"}, {"field": "location", "op": "ne", "val": "north"}] },
    pg: {sql: 'SELECT account_id as id, created_on, name, last_login, location FROM public.accounts WHERE name = $1 AND location != $2 LIMIT 20 OFFSET 0', params: ['account1', 'north']},
    response: {status: 200, body: [{id: 1, name: 'account1'}, {id: 2, name: 'account2'}]}
}, {
    args: { m: 'GET', url: '/api/accounts?name=in=account1,account2&location=gt=1'},
    orm: { api: 'accounts', op: 'R', filters: [{"field": "name", "op": "in", "val": ['account1','account2']}, {"field": "location", "op": "gt", "val": "1"}] },
    pg: {sql: 'SELECT account_id as id, created_on, name, last_login, location FROM public.accounts WHERE name IN ($1, $2) AND location > $3 LIMIT 20 OFFSET 0', params: ['account1', 'account2', '1']},
    response: {status: 200, body: [{id: 1, name: 'account1'}, {id: 2, name: 'account2'}]}
}, {
    args: { m: 'GET', url: '/api/accounts?name=ge=2&location=lt=1&order_desc=created_on,last_login'},
    orm: { api: 'accounts', op: 'R', filters: [{"field": "name", "op": "ge", "val": "2"}, {"field": "location", "op": "lt", "val": "1"}, { op: 'order_desc', val: ['created_on', 'last_login'] }] },
    pg: {sql: 'SELECT account_id as id, created_on, name, last_login, location FROM public.accounts WHERE name >= $1 AND location < $2 LIMIT 20 OFFSET 0 ORDER BY created_on DESC, last_login DESC', params: ['2', '1']},
    response: {status: 200, body: []}
}, {
    args: { m: 'GET', url: '/api/accounts?name=le=2&location=like=account&order_asc=last_login,created_on&offset=10&limit=30'},
    orm: { api: 'accounts', op: 'R', filters: [ { field: 'name', op: 'le', val: '2' }, { field: 'location', op: 'like', val: 'account' }, { op: 'order_asc', val: ['last_login', 'created_on'] }, { op: 'offset', val: 10 }, { op: 'limit', val: 30 } ] },
    pg: {sql: 'SELECT account_id as id, created_on, name, last_login, location FROM public.accounts WHERE name <= $1 AND location LIKE $2 LIMIT 30 OFFSET 10 ORDER BY last_login ASC, created_on ASC', params: ['2', '%account%']},
    response: {status: 200, body: [{id: 1, name: 'account1'}, {id: 2, name: 'account2'}]}
}, {
    args: { m: 'GET', url: '/api/accounts?limit=300'},
    orm: { api: 'accounts', op: 'R', filters: [{ op: 'limit', val: 100 }] },
    pg: {sql: 'SELECT account_id as id, created_on, name, last_login, location FROM public.accounts LIMIT 100 OFFSET 0', params: []},
    response: {status: 200, body: [{id: 1, name: 'account1'}, {id: 2, name: 'account2'}]}
}, {
    args: { m: 'GET', url: '/api/accounts?name=account1&limit=hacked'},
    response: {status: 400, body: {"message":"Expected positive number for limit", "status":400, "timestamp":"2021-04-01T20:01:02.123Z"}}
}, {
    args: { m: 'GET', url: '/api/accounts?name=account1&offset=maybe'},
    response: {status: 400, body: {"message":"Expected positive number for offset","status":400,"timestamp":"2021-04-01T20:01:02.123Z"}}
}];

module.exports.tests = tests
module.exports.mock_date = mock_date
