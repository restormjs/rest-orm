const expect = require('chai').expect

const reference = {
  server: {
    max_query_params: 10,
    cors: {
      origin: 'http://localhost:3002'
    }
  },
  api: {
    path_prefix: '/api',
    max_filters: 10,
    default_limit: 20,
    max_limit: 100,
    filters: {
      C: '',
      R: 'id:0-1,eq:0+,ne:0+,gt:0+,ge:0+,lt:0+,le:0+,like:0+,in:0+,offset:0-1,limit:0-1,order_desc:0-1,order_asc:0-1',
      U: 'id:1',
      D: 'id:1'
    },
    auth_header: 'x-rs-authtoken',
    paths: {
      '/': 'api-spec.json'
    }
  },
  orm: {
    provider: './provider/pg-orm',
    auth_query: 'SELECT * from auth.authenticate($1, $2)',
    end_auth_query: 'SELECT * from auth.end_authentication()'
  },
  db: {
    public: {
      user: 'restormjs',
      host: 'localhost',
      database: 'restormjs',
      password: 'restormjs',
      port: 5432
    }
  }
}

describe('Json configuration validator', function () {
  it('Test that generated configuration is a reference configuration', function (done) {
    const out = []
    console.log = (m) => {
      out.push(m)
    }
    require('../bin/getconf')
    expect(out.length).to.be.equal(1, 'Console output messages')
    const generated = JSON.parse(out[0])
    expect(generated).to.deep.equal(reference, 'Reference configuration')
    done()
  })
})
