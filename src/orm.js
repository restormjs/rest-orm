
const config = require('./config');

switch (config.orm.provider) {
    case "pg": module.exports = require("./provider/pg-orm")
        break;
    default: throw "There is no such orm provider " + config.orm.provider
}
