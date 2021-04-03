/* eslint-disable no-unused-expressions */
process.env.NODE_ENV = 'test'

const chai = require('chai')
chai.use(require('chai-http'))
const expect = chai.expect

const scenarios = require('./scenarios')
const mock_date = scenarios.mock_date

const mockdate = require('mockdate')

const request = require('request')
const proxyquire = require('proxyquire')

let server
const orm = { '@global': true }
const URL_BASE = 'http://localhost:3002'

describe('HTTP queries', function () {
  before(() => {
    mockdate.set(mock_date)
    server = proxyquire('../bin/www.js', {
      '../config.json': {
        test: {
          server: {
            cors: {
              origin: 'http://localhost:3002'
            }
          },
          api: {
            paths: {
              '/': './spec/product-api-spec.json'
            },
            path_prefix: '/api'
          }
        },
        '@global': true
      },
      '../src/provider/inmem-orm': orm
    })
  })

  scenarios.tests.forEach((t) => {
    it(`Test ${t.args.m} ${t.args.url} responds ${t.response.status}`, function (done) {
      let orm_executed = false
      orm.execute = function (query, done) {
        orm_executed = true
        expect(query.api.path).to.equal(t.orm.api, 'API path')
        expect(query.operation).to.equal(t.orm.op, 'Query operation')
        if (t.orm.filters) { expect(query.filters).to.deep.equal(t.orm.filters, `Actual filters: ${JSON.stringify(query.filters)}`) } else { expect(query.filters).to.be.empty }
        if (t.orm.payload) { expect(query.payload).to.deep.equal(t.orm.payload, `Actual payload: ${JSON.stringify(query.payload)}`) } else { expect(query.payload).to.be.undefined }

        done(null, t.response.body ? t.response.body : null)
      }

      request({
        method: t.args.m,
        uri: URL_BASE + t.args.url,
        body: t.args.payload,
        headers: {
          'x-rs-authtoken': '12345'
        },
        json: true
      },
      function (error, response, body) {
        expect(error).to.be.null
        expect(response.statusCode).to.equal(t.response.status, `Response status mismatched because ${body ? JSON.stringify(body) : ''}`)
        if (t.response.body) {
          expect(body).to.deep.equal(t.response.body, `Actual body was: ${JSON.stringify(body)}`)
          expect(response).to.be.json
        } else { expect(body).to.be.undefined }

        expect(orm_executed).to.be.equal(t.orm !== undefined, 'execute should not be called')
        done()
      })
    })
  })

  after(() => {
    mockdate.reset()
    if (server) { server.close() }
  })
})
