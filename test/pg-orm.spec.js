/* eslint-disable no-unused-expressions */

const chai = require('chai')
chai.use(require('chai-http'))
const expect = chai.expect

const scenarios = require('./scenarios')
const mock_date = scenarios.mock_date

const mockdate = require('mockdate')

const request = require('request')
const proxyquire = require('proxyquire')

let server
let public_client
let auth_client
const pool = {
  public: function (ready) {
    ready(public_client, function () {
      public_client = null
    })
  },
  auth: function (ready) {
    ready(auth_client, function () {
      auth_client = null
    })
  },
  '@global': true
}
const URL_BASE = 'http://localhost:3002'

describe('Postgresql queries', function () {
  before(() => {
    mockdate.set(mock_date)
    server = proxyquire('../bin/restormjs-server.js', {
      '../config.json': {
        development: {
          server: {
            cors: {
              origin: 'http://localhost:3002'
            }
          },
          api: {
            paths: {
              '/': './spec/product-api-spec.json',
              acc: './spec/account-api-spec.json'
            },
            path_prefix: '/api'
          },
          orm: {
            provider: './provider/pg-orm',
            auth_query: 'authenticate',
            end_auth_query: 'release_auth'
          }
        },
        '@global': true
      },
      '../src/provider/pg-pool': pool
    })
  })

  scenarios.tests.filter(t => t.orm).forEach(t => {
    it(`Test ${t.args.m} ${t.args.url} responds ${t.response.status}`, function (done) {
      let querySequence = 0
      public_client = {}
      auth_client = {}
      auth_client.query = function (sql, params) {
        ++querySequence
        if (querySequence === 1) {
          expect(t.pg.public).undefined
          expect(sql).to.equal('authenticate')
          expect(params).to.deep.equal(['12345', 'other-other0-other'])
          return new Promise((resolve) => {
            resolve({ rows: [{ authenticate: 'user1' }] })
          })
        }
        if (querySequence === 2) {
          expect(sql).to.equal(t.pg.sql)
          expect(params).to.deep.equal(t.pg.params)
          return new Promise((resolve) => {
            resolve({ rows: t.response.body })
          })
        }
        if (querySequence === 3) {
          expect(sql).to.equal('release_auth')
          expect(params).to.be.undefined
          return new Promise((resolve) => {
            resolve({ rows: [] })
          })
        }
      }
      public_client.query = function (sql, params) {
        ++querySequence
        expect(t.pg.public).true
        expect(querySequence).to.equal(1)
        expect(sql).to.equal(t.pg.sql)
        expect(params).to.deep.equal(t.pg.params)
        return new Promise((resolve) => {
          resolve({ rows: t.response.body })
        })
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
        expect(response.statusCode).to.equal(t.response.status, `Response status mismatched because ${body ? body.message : ''}`)
        if (t.response.body) {
          expect(body).to.deep.equal(t.response.body, `Actual body was: ${JSON.stringify(body)}`)
          expect(response).to.be.json
        } else { expect(body).to.be.undefined }
        expect(querySequence).to.be.equal((t.pg.public ? 1 : 3), 'Query sequence')
        done()
      })
    })
  })

  after(() => {
    mockdate.reset()
    if (server) { server.close() }
  })
})
