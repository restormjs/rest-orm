
const proxyquire = require('proxyquire')
const chai = require('chai')
const expect = chai.expect
const sinon = require('sinon')

describe('restormjs-pg-spec - command line arguments', function () {
  const scenarios = [
    {
      in: ['restormjs-pg-spec.spec', '--db-user=menot', '--api-name=restormjs-pg-spec test', '--api-desc=restormjs-pg-spec test desc'],
      out: { schema: 'public', name: 'restormjs-pg-spec test', desc: 'restormjs-pg-spec test desc', version: '0.0.1', db_user: 'menot', pub_role: 'menot' }
    }, {
      in: ['restormjs-pg-spec.spec', '--db-passwd=pw1234', '--db-user=menot', '--api-name=restormjs-pg-spec test', '--api-desc=restormjs-pg-spec test desc'],
      out: { schema: 'public', name: 'restormjs-pg-spec test', desc: 'restormjs-pg-spec test desc', version: '0.0.1', db_user: 'menot', db_passwd: 'pw1234', pub_role: 'menot' }
    }, {
      in: ['restormjs-pg-spec.spec', '--db-host=example.com', '--api-name=restormjs-pg-spec test', '--api-desc=restormjs-pg-spec test desc'],
      out: { schema: 'public', name: 'restormjs-pg-spec test', desc: 'restormjs-pg-spec test desc', version: '0.0.1', db_host: 'example.com', db_port: 5432 }
    }, {
      in: ['restormjs-pg-spec.spec', '--db-port=1234', '--db-user=menot', '--api-name=restormjs-pg-spec test', '--api-desc=restormjs-pg-spec test desc'],
      out: { schema: 'public', name: 'restormjs-pg-spec test', desc: 'restormjs-pg-spec test desc', version: '0.0.1', db_user: 'menot', db_port: '1234', pub_role: 'menot' }
    }, {
      in: ['restormjs-pg-spec.spec', '--db-conn=postgres://me:not@example.com:1234/testdb', '--api-name=restormjs-pg-spec test', '--api-desc=restormjs-pg-spec test desc'],
      out: { schema: 'public', name: 'restormjs-pg-spec test', desc: 'restormjs-pg-spec test desc', version: '0.0.1', db_conn: 'postgres://me:not@example.com:1234/testdb' }
    }, {
      in: ['restormjs-pg-spec.spec', '--db-name=testdb', '--db-user=menot'],
      out: { schema: 'public', name: 'testdb-public APIs', desc: 'Auto generated RESTORMJS api from public schema using restorm-pg-spec', version: '0.0.1', db_user: 'menot', db_name: 'testdb', pub_role: 'menot' }
    }, {
      in: ['restormjs-pg-spec.spec', '--db-schema=anotherschema', '--api-name=restormjs-pg-spec test', '--api-desc=restormjs-pg-spec test desc'],
      out: { schema: 'anotherschema', name: 'restormjs-pg-spec test', desc: 'restormjs-pg-spec test desc', version: '0.0.1' }
    }, {
      in: ['restormjs-pg-spec.spec', '--output=test-spec.json', '--api-name=restormjs-pg-spec test', '--api-desc=restormjs-pg-spec test desc'],
      out: { schema: 'public', output: 'test-spec.json', name: 'restormjs-pg-spec test', desc: 'restormjs-pg-spec test desc', version: '0.0.1' }
    }, {
      in: ['restormjs-pg-spec.spec', '--db-tables=table1,anothertable,something_number_3', '--api-name=restormjs-pg-spec test', '--api-desc=restormjs-pg-spec test desc'],
      out: { schema: 'public', tables: ['table1', 'anothertable', 'something_number_3'], name: 'restormjs-pg-spec test', desc: 'restormjs-pg-spec test desc', version: '0.0.1' }
    }, {
      in: ['restormjs-pg-spec.spec', '--api-name=mega test api'],
      out: { schema: 'public', name: 'mega test api', desc: 'Auto generated RESTORMJS api from public schema using restorm-pg-spec', version: '0.0.1' }
    }, {
      in: ['restormjs-pg-spec.spec', '--api-desc=RESTORMJS is the best API server oh my'],
      out: { schema: 'public', name: 'restormjs-public APIs', desc: 'RESTORMJS is the best API server oh my', version: '0.0.1' }
    }, {
      in: ['restormjs-pg-spec.spec', '--api-version=1.2.3'],
      out: { schema: 'public', name: 'restormjs-public APIs', desc: 'Auto generated RESTORMJS api from public schema using restorm-pg-spec', version: '1.2.3' }
    }, {
      in: ['restormjs-pg-spec.spec', '--pub-role=everyoneisgranted', '--api-desc=restormjs-pg-spec test desc'],
      out: { schema: 'public', name: 'restormjs-public APIs', desc: 'restormjs-pg-spec test desc', version: '0.0.1', pub_role: 'everyoneisgranted' }
    }, {
      in: ['restormjs-pg-spec.spec', '--auth-role=muchprotected', '--api-desc=restormjs-pg-spec test desc'],
      out: { schema: 'public', name: 'restormjs-public APIs', desc: 'restormjs-pg-spec test desc', version: '0.0.1', auth_role: 'muchprotected' }
    }, {
      in: ['restormjs-pg-spec.spec', '--db-host=example.com', '--db-port=1234', '--db-user=testuser', '--db-passwd=pwd123', '--db-name=testdb', '--db-schema=testschema', '--pub-role=testpub', '--auth-role=testauthreq', '--api-name=test api', '--api-desc=test desc', '--api-version=1.0.1', '--output=test-spec.json', '--db-tables=table1,test2,something3,anything4'],
      out: { schema: 'testschema', output: 'test-spec.json', tables: ['table1', 'test2', 'something3', 'anything4'], name: 'test api', desc: 'test desc', version: '1.0.1', auth_role: 'testauthreq', db_user: 'testuser', db_host: 'example.com', db_name: 'testdb', db_passwd: 'pwd123', db_port: '1234', pub_role: 'testpub' }
    }, {
      in: ['restormjs-pg-spec.spec', '--db-conn=postgres://me:not@example.com:1234/testdb', '--db-schema=testschema', '--pub-role=testpub', '--auth-role=testauthreq', '--api-name=test api', '--api-desc=test desc', '--api-version=1.0.1', '--output=test-spec.json', '--db-tables=table1,test2,something3,anything4'],
      out: { schema: 'testschema', output: 'test-spec.json', tables: ['table1', 'test2', 'something3', 'anything4'], name: 'test api', desc: 'test desc', version: '1.0.1', auth_role: 'testauthreq', db_conn: 'postgres://me:not@example.com:1234/testdb', pub_role: 'testpub' }
    }
  ]

  const err = []

  before(() => {
    console.error = function (m) {
      err.push(m)
    }
  })

  scenarios.forEach((scenario) => {
    it(`Arguments: ${scenario.in}`, function (done) {
      const pgClientStub = { connect: sinon.stub().returnsThis() }
      const Client = sinon.stub().callsFake((args) => {
        Object.assign(pgClientStub, args)
        return pgClientStub
      })
      pgClientStub.query = function (sql, params, done) {
      }
      scenario.in['@global'] = true
      proxyquire('../bin/restormjs-pg-spec', {
        pg: {
          Client
        },
        '../src/argv': scenario.in
      })
      const conf = getConfig(err)
      expect(conf).to.deep.equal(scenario.out, `Actual config was: ${JSON.stringify(conf)}`)
      expect(pgClientStub.connectionString).to.be.equal(scenario.out.db_conn)
      expect(pgClientStub.user).to.be.equal(scenario.out.db_user)
      expect(pgClientStub.host).to.be.equal(scenario.out.db_host)
      expect(pgClientStub.password).to.be.equal(scenario.out.db_passwd)
      expect(pgClientStub.database).to.be.equal(scenario.out.db_name)
      expect(pgClientStub.port).to.be.equal(scenario.out.db_port)
      done()
    })
  })

  it('Arguments: --help', function (done) {
    sinon.stub(process, 'exit')

    const pgClientStub = {
      connect: sinon.stub().returnsThis(),
      query: function (sql, params, done) {}
    }
    const Client = sinon.stub().callsFake((args) => {
      Object.assign(pgClientStub, args)
      return pgClientStub
    })

    const argv = ['command', '--help']
    argv['@global'] = true
    proxyquire('../bin/restormjs-pg-spec', {
      pg: {
        Client
      },
      '../src/argv': argv
    })

    /* eslint-disable no-unused-expressions */
    expect(process.exit.calledWith(1)).to.be.true
    done()
  })

  afterEach(() => {
    delete process.env.argv
    err.length = 0
  })
})

function getConfig (err) {
  for (const s of err) {
    const m = s.match(/Config: (\{.+\})\n-/)
    if (m && m.length === 2) {
      return JSON.parse(m[1])
    }
  }
  throw new Error(`Expected to see config from output: ${err}`)
}
