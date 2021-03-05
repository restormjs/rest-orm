process.env.NODE_ENV = 'test'

var expect  = require("chai").expect;
var request = require("request");
var proxyquire =  require('proxyquire')

var server;
var provider = {'@global': true}
const URL_BASE = 'http://localhost:3002'

describe('HTTP queries', function() {
    before(() => {
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
                        root: '/api'
                    },
                    orm: {
                        provider: '../src/provider/dummy'
                    }
                }, '@global': true
            },
            '../src/provider/dummy': provider
        });
    });

    it('Get single record by id in path', function(done) {
        provider.execute = function (query, done) {
            done(null, {id: 1, name: 'account1'})
        }

        request(URL_BASE + '/api/accounts/1', function(error, response, body) {
            expect(response.statusCode).to.equal(200);
            done();
        });
    });

    after(() => {
        if (server)
            server.close()
    });
});
