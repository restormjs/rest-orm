const Ajv = require('ajv')
const expect = require('chai').expect
const fs = require('fs')

const ajv = new Ajv({ allErrors: true })
ajv.addMetaSchema(require('ajv/lib/refs/json-schema-draft-06.json'))

let schema

const specs = ['playground-api-spec.json', 'product-api-spec.json', 'account-api-spec.json']

describe('JSON SCHEMA Validator', function () {
  before(() => {
    schema = JSON.parse(fs.readFileSync('spec/schema/restormjs.schema.json'))
  })

  specs.forEach(s => {
    it(`Test that '${s}' validates against restormjs schema`, function (done) {
      const validate = ajv.compile(schema)
      const data = JSON.parse(fs.readFileSync(`spec/${s}`))
      const valid = validate(data)
      expect(valid).to.be.equal(true, '' + JSON.stringify(validate.errors))
      done()
    })
  })
})
