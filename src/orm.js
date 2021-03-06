
const config = require('./config');
module.exports = require(config.orm.provider)
