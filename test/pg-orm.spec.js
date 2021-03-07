process.env.NODE_ENV = 'test'

const chai = require('chai')
chai.use(require('chai-http'));
const expect  = chai.expect;

const scenarios = require('./scenarios')
const mock_date = scenarios.mock_date

const mockdate = require('mockdate')

const request = require("request");
const proxyquire =  require('proxyquire')

let server;
let client = {public: {}, protected: {}, '@global': true}
const URL_BASE = 'http://localhost:3002'

describe('Postgresql queries', function() {
    before(() => {
        mockdate.set(mock_date)
        server = proxyquire('../bin/www', {
            '../config.json': {
                test: {
                    server: {
                        cors: {
                            origin: 'http://localhost:3002'
                        }
                    },
                    api: {
                        paths: {
                            '/': './test/test-api-spec.json'
                        },
                        path_prefix: '/api'
                    },
                    orm: {
                        provider: './provider/pg-orm'
                    },
                }, '@global': true
            },
            '../src/provider/pg-client': client
        });
    });

    scenarios.tests.filter(t => t.orm).forEach(t => {
        it(`Test ${t.args.m} ${t.args.url} responds ${t.response.status}`, function(done) {
            client.public.query = function (sql, params) {
                expect(sql).to.equal(t.pg.sql)
                expect(params).to.deep.equal(t.pg.params)
                return new Promise((resolve) => {
                    resolve({rows: [t.response.body]})
                })
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
