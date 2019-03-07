
let _ = require('lodash')
let co = require('co')
let requireAll = require('require-all')

/* global VERSION */

let commands = requireAll({
  dirname: `${__dirname}/commands`
})

let HELPTEXT = `

  ThinkSync ${VERSION}
  ==============================

  A RethinkDB synchronization tool.

  Commands:
    thinksync [sync]          Synchronize differences between two databases.
    thinksync clone           Clone a database locally or between remote hosts.
    thinksync -h | --help     Show this screen.

`

 // Some notes --> process.stdout.write(" RECORDS INSERTED: Total = #{records_processed} | Per Second = #{rps} | Percent Complete = %#{pc}          \r");

module.exports = function (argv) {
  return co(function *() {
    let command = _.first(argv['_'])
    if (commands[command]) {
      argv['_'] = argv['_'].slice(1)
    } else {
      command = 'sync';
    }
    yield commands[command](argv)

    process.exit()
  })
  .catch(function (err) {
    console.log('ERROR')
    console.log(err)
  })
}
