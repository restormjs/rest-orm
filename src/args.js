
const argv = require('./argv')

const args = {
  bin: argv[0],
  usage: function (usage) {
    console.error(usage)
    process.exit(1)
  }
}

argv.filter(a => a.startsWith('--')).forEach(a => {
  const t = a.split('=')
  if (t.length > 0) {
    const n = t[0].substring(2)
    const v = t.length > 1 ? t[1] : true
    args[n] = v
  }
})

module.exports = args
