process.env.NODE_ENV = 'test'

const chai = require('chai')
chai.use(require('chai-http'));
const expect  = chai.expect;

const mockdate = require('mockdate')

const request = require("request");
const proxyquire =  require('proxyquire')

let server;
let orm = {'@global': true}
const URL_BASE = 'http://localhost:3002'

const mock_date = '2021-04-01T20:01:02.123Z'

describe('HTTP queries', function() {
    before(() => {
        mockdate.set(mock_date)
        server = proxyquire('../bin/www', {
            '../config.json': {
                test: {
                    api: {
                        cors: {
                            origin: 'http://localhost:3002'
                        },
                        paths: {
                            '/': './test/test-api-spec.json'
                        },
                        path_prefix: '/api'
                    },
                    orm: {
                        provider: '../src/provider/dummy'
                    }
                }, '@global': true
            },
            '../src/provider/dummy': orm
        });
    });

    const tests = [ {
        args: { m: 'GET', url: '/api/accounts/1' },
        orm: { api: 'accounts', op: 'R', filters: [{"field": "id", "op": "ID", "val": "1"}] },
        response: {status: 200, body: {id: 1, name: 'account1'}}
    }, {
        args: { m: 'POST', url: '/api/accounts', payload: {id: 1, name: 'account1'} },
        orm: { api: 'accounts', op: 'C', payload: {id: 1, name: 'account1'} },
        response: {status: 200, body: {id: 3}}
    }, {
        args: { m: 'PATCH', url: '/api/accounts/1', payload: {id: "1", name: 'account1'} },
        orm: { api: 'accounts', op: 'U', filters: [{"field": "id", "op": "ID", "val": "1"}], payload: {id: "1", name: 'account1'} },
        response: {status: 204}
    }, {
        args: { m: 'DELETE', url: '/api/accounts/1'},
        orm: { api: 'accounts', op: 'D', filters: [{"field": "id", "op": "ID", "val": "1"}] },
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

    tests.forEach((t) => {
        it(`Test ${t.args.m} ${t.args.url} responds ${t.response.status}`, function(done) {
            let orm_executed = false
            orm.execute = function (query, done) {
                orm_executed = true
                expect(query.api.path).to.equal(t.orm.api)
                expect(query.operation).to.equal(t.orm.op)
                if (t.orm.filters)
                    expect(query.filters).to.deep.equal(t.orm.filters)
                else
                    expect(query.filters).to.be.empty
                if (t.orm.payload)
                    expect(query.payload).to.deep.equal(t.orm.payload)
                else
                    expect(query.payload).to.be.undefined

                done(null, t.response.body ? t.response.body: null)
            }

            request({
                    method: t.args.m,
                    uri: URL_BASE + t.args.url,
                    body: t.args.payload,
                    json: true
                },
        function(error, response, body) {
                    expect(error).to.be.null
                    expect(response.statusCode).to.equal(t.response.status, `Response status mismatched because ${body ? body.message: ''}`);
                    if (t.response.body) {
                        expect(body).to.deep.equal(t.response.body, `Actual body was: ${JSON.stringify(body)}`);
                        expect(response).to.be.json;
                    }
                    else
                        expect(body).to.be.undefined

                    expect(orm_executed).to.be.equal(t.orm != undefined, "execute should not be called")
                    done();
                });
        });
    });

    after(() => {
        mockdate.reset()
        if (server)
            server.close()
    });
});
