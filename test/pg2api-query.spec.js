
const proxyquire = require('proxyquire')
const chai = require('chai')
const expect = chai.expect
const sinon = require('sinon')
const fs = require('fs')
const mockdate = require('mockdate')

describe('pg2api - spec generator tests', function () {
  const scenarios = [
    {
      spec: 'product-api-spec.json',
      argv: ['pg2api.spec', '--auth-role=restormjs'],
      queries: [
        {
          res: {
            rows: [{ table_name: 'customer', column_name: 'id', is_nullable: 'NO', data_type: 'integer', character_octet_length: null, is_pk: '1', has_default: '0' },
              { table_name: 'customer', column_name: 'postalcode', is_nullable: 'YES', data_type: 'character varying', character_octet_length: 60, is_pk: '0', has_default: '1' },
              { table_name: 'product', column_name: 'id', is_nullable: 'NO', data_type: 'integer', character_octet_length: null, is_pk: '1', has_default: '0' },
              { table_name: 'product', column_name: 'price', is_nullable: 'NO', data_type: 'character varying', character_octet_length: 28, is_pk: '0', has_default: '0' },
              { table_name: 'product', column_name: 'product_name', is_nullable: 'NO', data_type: 'character varying', character_octet_length: 200, is_pk: '0', has_default: '0' },
              { table_name: 'product', column_name: 'qty', is_nullable: 'NO', data_type: 'character varying', character_octet_length: 16, is_pk: '0', has_default: '0' },
              { table_name: 'product_transaction', column_name: 'prod_id', is_nullable: 'NO', data_type: 'integer', character_octet_length: null, is_pk: '0', has_default: '0' },
              { table_name: 'product_transaction', column_name: 'trans_id', is_nullable: 'NO', data_type: 'integer', character_octet_length: null, is_pk: '0', has_default: '0' },
              { table_name: 'transactions', column_name: 'id', is_nullable: 'NO', data_type: 'integer', character_octet_length: null, is_pk: '1', has_default: '0' },
              { table_name: 'transactions', column_name: 'cust_id', is_nullable: 'YES', data_type: 'integer', character_octet_length: null, is_pk: '0', has_default: '0' },
              { table_name: 'transactions', column_name: 'timedate', is_nullable: 'YES', data_type: 'timestamp without time zone', character_octet_length: null, is_pk: '0', has_default: '0' }]
          }
        },
        {
          res: {
            rows: [{ grantee: 'restormjs', table_name: 'customer', privilege_type: 'DELETE' },
              { grantee: 'restormjs', table_name: 'customer', privilege_type: 'INSERT' },
              { grantee: 'restormjs', table_name: 'customer', privilege_type: 'SELECT' },
              { grantee: 'restormjs', table_name: 'customer', privilege_type: 'UPDATE' },
              { grantee: 'restormjs', table_name: 'product', privilege_type: 'DELETE' },
              { grantee: 'restormjs', table_name: 'product', privilege_type: 'INSERT' },
              { grantee: 'restormjs', table_name: 'product', privilege_type: 'SELECT' },
              { grantee: 'restormjs', table_name: 'product', privilege_type: 'UPDATE' },
              { grantee: 'restormjs', table_name: 'product_transaction', privilege_type: 'DELETE' },
              { grantee: 'restormjs', table_name: 'product_transaction', privilege_type: 'INSERT' },
              { grantee: 'restormjs', table_name: 'product_transaction', privilege_type: 'SELECT' },
              { grantee: 'restormjs', table_name: 'product_transaction', privilege_type: 'UPDATE' },
              { grantee: 'restormjs', table_name: 'transactions', privilege_type: 'INSERT' },
              { grantee: 'restormjs', table_name: 'transactions', privilege_type: 'SELECT' }]
          }
        },
        {
          res: {
            rows: [{ grantee: 'restormjs', table_name: 'customer', column_name: 'id', privilege_type: 'INSERT' },
              { grantee: 'restormjs', table_name: 'customer', column_name: 'id', privilege_type: 'SELECT' },
              { grantee: 'restormjs', table_name: 'customer', column_name: 'postalcode', privilege_type: 'INSERT' },
              { grantee: 'restormjs', table_name: 'customer', column_name: 'postalcode', privilege_type: 'SELECT' },
              { grantee: 'restormjs', table_name: 'customer', column_name: 'postalcode', privilege_type: 'UPDATE' },
              { grantee: 'restormjs', table_name: 'product', column_name: 'id', privilege_type: 'INSERT' },
              { grantee: 'restormjs', table_name: 'product', column_name: 'id', privilege_type: 'SELECT' },
              { grantee: 'restormjs', table_name: 'product', column_name: 'price', privilege_type: 'INSERT' },
              { grantee: 'restormjs', table_name: 'product', column_name: 'price', privilege_type: 'SELECT' },
              { grantee: 'restormjs', table_name: 'product', column_name: 'price', privilege_type: 'UPDATE' },
              { grantee: 'restormjs', table_name: 'product', column_name: 'product_name', privilege_type: 'INSERT' },
              { grantee: 'restormjs', table_name: 'product', column_name: 'product_name', privilege_type: 'SELECT' },
              { grantee: 'restormjs', table_name: 'product', column_name: 'product_name', privilege_type: 'UPDATE' },
              { grantee: 'restormjs', table_name: 'product', column_name: 'qty', privilege_type: 'INSERT' },
              { grantee: 'restormjs', table_name: 'product', column_name: 'qty', privilege_type: 'SELECT' },
              { grantee: 'restormjs', table_name: 'product', column_name: 'qty', privilege_type: 'UPDATE' },
              { grantee: 'restormjs', table_name: 'product_transaction', column_name: 'prod_id', privilege_type: 'INSERT' },
              { grantee: 'restormjs', table_name: 'product_transaction', column_name: 'prod_id', privilege_type: 'SELECT' },
              { grantee: 'restormjs', table_name: 'product_transaction', column_name: 'trans_id', privilege_type: 'INSERT' },
              { grantee: 'restormjs', table_name: 'product_transaction', column_name: 'trans_id', privilege_type: 'SELECT' },
              { grantee: 'restormjs', table_name: 'transactions', column_name: 'cust_id', privilege_type: 'INSERT' },
              { grantee: 'restormjs', table_name: 'transactions', column_name: 'cust_id', privilege_type: 'SELECT' },
              { grantee: 'restormjs', table_name: 'transactions', column_name: 'cust_id', privilege_type: 'UPDATE' },
              { grantee: 'restormjs', table_name: 'transactions', column_name: 'id', privilege_type: 'INSERT' },
              { grantee: 'restormjs', table_name: 'transactions', column_name: 'id', privilege_type: 'SELECT' },
              { grantee: 'restormjs', table_name: 'transactions', column_name: 'timedate', privilege_type: 'INSERT' },
              { grantee: 'restormjs', table_name: 'transactions', column_name: 'timedate', privilege_type: 'SELECT' },
              { grantee: 'restormjs', table_name: 'transactions', column_name: 'timedate', privilege_type: 'UPDATE' }]
          }
        }]
    }, {
      spec: 'playground-api-spec.json',
      argv: ['pg2api.spec', '--pub-role=restormjs', '--api-name=Sample api spec describing playground table'],
      queries: [
        {
          res: {
            rows: [{ table_name: 'playground', column_name: 'equip_id', is_nullable: 'NO', data_type: 'integer', character_octet_length: null, is_pk: '1', has_default: '1' },
              { table_name: 'playground', column_name: 'color', is_nullable: 'NO', data_type: 'character varying', character_octet_length: 100, is_pk: '0', has_default: '0' },
              { table_name: 'playground', column_name: 'install_date', is_nullable: 'YES', data_type: 'date', character_octet_length: null, is_pk: '0', has_default: '0' },
              { table_name: 'playground', column_name: 'location', is_nullable: 'YES', data_type: 'character varying', character_octet_length: 100, is_pk: '0', has_default: '0' },
              { table_name: 'playground', column_name: 'type', is_nullable: 'NO', data_type: 'character varying', character_octet_length: 200, is_pk: '0', has_default: '0' }]
          }
        },
        {
          res: {
            rows: [{ grantee: 'restormjs', table_name: 'playground', privilege_type: 'DELETE' },
              { grantee: 'restormjs', table_name: 'playground', privilege_type: 'INSERT' },
              { grantee: 'restormjs', table_name: 'playground', privilege_type: 'SELECT' },
              { grantee: 'restormjs', table_name: 'playground', privilege_type: 'UPDATE' }]
          }
        },
        {
          res: {
            rows: [{ grantee: 'restormjs', table_name: 'playground', column_name: 'color', privilege_type: 'INSERT' },
              { grantee: 'restormjs', table_name: 'playground', column_name: 'color', privilege_type: 'SELECT' },
              { grantee: 'restormjs', table_name: 'playground', column_name: 'color', privilege_type: 'UPDATE' },
              { grantee: 'restormjs', table_name: 'playground', column_name: 'equip_id', privilege_type: 'INSERT' },
              { grantee: 'restormjs', table_name: 'playground', column_name: 'equip_id', privilege_type: 'SELECT' },
              { grantee: 'restormjs', table_name: 'playground', column_name: 'equip_id', privilege_type: 'UPDATE' },
              { grantee: 'restormjs', table_name: 'playground', column_name: 'install_date', privilege_type: 'INSERT' },
              { grantee: 'restormjs', table_name: 'playground', column_name: 'install_date', privilege_type: 'SELECT' },
              { grantee: 'restormjs', table_name: 'playground', column_name: 'install_date', privilege_type: 'UPDATE' },
              { grantee: 'restormjs', table_name: 'playground', column_name: 'location', privilege_type: 'INSERT' },
              { grantee: 'restormjs', table_name: 'playground', column_name: 'location', privilege_type: 'SELECT' },
              { grantee: 'restormjs', table_name: 'playground', column_name: 'location', privilege_type: 'UPDATE' },
              { grantee: 'restormjs', table_name: 'playground', column_name: 'type', privilege_type: 'INSERT' },
              { grantee: 'restormjs', table_name: 'playground', column_name: 'type', privilege_type: 'SELECT' },
              { grantee: 'restormjs', table_name: 'playground', column_name: 'type', privilege_type: 'UPDATE' }]
          }
        }]
    }, {
      spec: 'account-api-spec.json',
      argv: ['pg2api.spec', '--pub-role=restormjs', '--api-name=Sample API spec describing account and roles relation'],
      queries: [
        {
          res: {
            rows: [{ table_name: 'account_roles', column_name: 'grant_date', is_nullable: 'YES', data_type: 'timestamp without time zone', character_octet_length: null, is_pk: '0', has_default: '0' },
              { table_name: 'account_roles', column_name: 'role_id', is_nullable: 'NO', data_type: 'numeric', character_octet_length: null, is_pk: '0', has_default: '0' },
              { table_name: 'account_roles', column_name: 'user_id', is_nullable: 'NO', data_type: 'bigint', character_octet_length: null, is_pk: '0', has_default: '0' },
              { table_name: 'accounts', column_name: 'user_id', is_nullable: 'NO', data_type: 'real', character_octet_length: null, is_pk: '1', has_default: '1' },
              { table_name: 'accounts', column_name: 'created_on', is_nullable: 'NO', data_type: 'timestamp without time zone', character_octet_length: null, is_pk: '0', has_default: '0' },
              { table_name: 'accounts', column_name: 'email', is_nullable: 'NO', data_type: 'character varying', character_octet_length: 1020, is_pk: '0', has_default: '0' },
              { table_name: 'accounts', column_name: 'last_login', is_nullable: 'YES', data_type: 'timestamp without time zone', character_octet_length: null, is_pk: '0', has_default: '0' },
              { table_name: 'accounts', column_name: 'password', is_nullable: 'NO', data_type: 'text', character_octet_length: 200, is_pk: '0', has_default: '0' },
              { table_name: 'accounts', column_name: 'username', is_nullable: 'NO', data_type: 'character varying', character_octet_length: 200, is_pk: '0', has_default: '0' },
              { table_name: 'roles', column_name: 'role_id', is_nullable: 'NO', data_type: 'integer', character_octet_length: null, is_pk: '1', has_default: '1' },
              { table_name: 'roles', column_name: 'role_name', is_nullable: 'NO', data_type: 'point', character_octet_length: 1020, is_pk: '0', has_default: '0' }]
          }
        },
        {
          res: {
            rows: [{ grantee: 'restormjs', table_name: 'account_roles', privilege_type: 'DELETE' },
              { grantee: 'restormjs', table_name: 'account_roles', privilege_type: 'INSERT' },
              { grantee: 'restormjs', table_name: 'account_roles', privilege_type: 'SELECT' },
              { grantee: 'restormjs', table_name: 'account_roles', privilege_type: 'UPDATE' },
              { grantee: 'restormjs', table_name: 'accounts', privilege_type: 'DELETE' },
              { grantee: 'restormjs', table_name: 'accounts', privilege_type: 'INSERT' },
              { grantee: 'restormjs', table_name: 'accounts', privilege_type: 'SELECT' },
              { grantee: 'restormjs', table_name: 'accounts', privilege_type: 'UPDATE' },
              { grantee: 'restormjs', table_name: 'roles', privilege_type: 'DELETE' },
              { grantee: 'restormjs', table_name: 'roles', privilege_type: 'INSERT' },
              { grantee: 'restormjs', table_name: 'roles', privilege_type: 'SELECT' },
              { grantee: 'restormjs', table_name: 'roles', privilege_type: 'UPDATE' }]
          }
        },
        {
          res: {
            rows: [{ grantee: 'restormjs', table_name: 'account_roles', column_name: 'grant_date', privilege_type: 'INSERT' },
              { grantee: 'restormjs', table_name: 'account_roles', column_name: 'grant_date', privilege_type: 'SELECT' },
              { grantee: 'restormjs', table_name: 'account_roles', column_name: 'grant_date', privilege_type: 'UPDATE' },
              { grantee: 'restormjs', table_name: 'account_roles', column_name: 'role_id', privilege_type: 'INSERT' },
              { grantee: 'restormjs', table_name: 'account_roles', column_name: 'role_id', privilege_type: 'SELECT' },
              { grantee: 'restormjs', table_name: 'account_roles', column_name: 'role_id', privilege_type: 'UPDATE' },
              { grantee: 'restormjs', table_name: 'account_roles', column_name: 'user_id', privilege_type: 'INSERT' },
              { grantee: 'restormjs', table_name: 'account_roles', column_name: 'user_id', privilege_type: 'SELECT' },
              { grantee: 'restormjs', table_name: 'account_roles', column_name: 'user_id', privilege_type: 'UPDATE' },
              { grantee: 'restormjs', table_name: 'accounts', column_name: 'created_on', privilege_type: 'INSERT' },
              { grantee: 'restormjs', table_name: 'accounts', column_name: 'created_on', privilege_type: 'SELECT' },
              { grantee: 'restormjs', table_name: 'accounts', column_name: 'created_on', privilege_type: 'UPDATE' },
              { grantee: 'restormjs', table_name: 'accounts', column_name: 'email', privilege_type: 'INSERT' },
              { grantee: 'restormjs', table_name: 'accounts', column_name: 'email', privilege_type: 'SELECT' },
              { grantee: 'restormjs', table_name: 'accounts', column_name: 'email', privilege_type: 'UPDATE' },
              { grantee: 'restormjs', table_name: 'accounts', column_name: 'last_login', privilege_type: 'INSERT' },
              { grantee: 'restormjs', table_name: 'accounts', column_name: 'last_login', privilege_type: 'SELECT' },
              { grantee: 'restormjs', table_name: 'accounts', column_name: 'last_login', privilege_type: 'UPDATE' },
              { grantee: 'restormjs', table_name: 'accounts', column_name: 'password', privilege_type: 'INSERT' },
              { grantee: 'restormjs', table_name: 'accounts', column_name: 'password', privilege_type: 'SELECT' },
              { grantee: 'restormjs', table_name: 'accounts', column_name: 'password', privilege_type: 'UPDATE' },
              { grantee: 'restormjs', table_name: 'accounts', column_name: 'user_id', privilege_type: 'INSERT' },
              { grantee: 'restormjs', table_name: 'accounts', column_name: 'user_id', privilege_type: 'SELECT' },
              { grantee: 'restormjs', table_name: 'accounts', column_name: 'user_id', privilege_type: 'UPDATE' },
              { grantee: 'restormjs', table_name: 'accounts', column_name: 'username', privilege_type: 'INSERT' },
              { grantee: 'restormjs', table_name: 'accounts', column_name: 'username', privilege_type: 'SELECT' },
              { grantee: 'restormjs', table_name: 'accounts', column_name: 'username', privilege_type: 'UPDATE' },
              { grantee: 'restormjs', table_name: 'roles', column_name: 'role_id', privilege_type: 'INSERT' },
              { grantee: 'restormjs', table_name: 'roles', column_name: 'role_id', privilege_type: 'SELECT' },
              { grantee: 'restormjs', table_name: 'roles', column_name: 'role_id', privilege_type: 'UPDATE' },
              { grantee: 'restormjs', table_name: 'roles', column_name: 'role_name', privilege_type: 'INSERT' },
              { grantee: 'restormjs', table_name: 'roles', column_name: 'role_name', privilege_type: 'SELECT' },
              { grantee: 'restormjs', table_name: 'roles', column_name: 'role_name', privilege_type: 'UPDATE' }]
          }
        }]
    }
  ]
  const out = []

  before(() => {
    console.log = function (m) {
      out.push(m)
    }
  })

  scenarios.forEach((scenario) => {
    it(`Tests that ${scenario.spec} specification generates correctly`, function (done) {
      let endCalled = 0
      const pgClientStub = {
        connect: sinon.stub().returnsThis(),
        end: function () {
          ++endCalled
        }
      }
      const Client = sinon.stub().callsFake((args) => {
        Object.assign(pgClientStub, args)
        return pgClientStub
      })
      let queryNumber = 0
      pgClientStub.query = function (sql, params, done) {
        const i = queryNumber++
        done(scenario.queries[i].err, scenario.queries[i].res)
      }
      const expected_spec = JSON.parse(fs.readFileSync(`spec/${scenario.spec}`))
      mockdate.set(expected_spec.created)
      scenario.argv['@global'] = true
      proxyquire('../bin/pg2api', {
        pg: {
          Client: Client
        },
        '../src/argv': scenario.argv
      })
      expect(queryNumber).to.be.equal(scenario.queries.length, 'Number of sql queries')
      expect(endCalled).to.be.equal(1, 'client.end() calls')
      expect(out.length).to.be.equal(1, 'Generated output messages')
      const generated = JSON.parse(out[0])
      expect(generated).to.deep.equal(expected_spec)
      done()
    })
  })

  afterEach(() => {
    mockdate.reset()
    out.length = 0
  })
})
