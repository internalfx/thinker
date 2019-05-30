
let _ = require('lodash')
let co = require('co')
let requireAll = require('require-all')

/* global VERSION */

let commands = requireAll({
  dirname: `${__dirname}/commands`
})

let HELPTEXT = `

  Thinker ${VERSION}
  ==============================

  A RethinkDB command line tool.

  Commands:
    thinker sync            Synchronize differences between two databases.
    thinker -h | --help     Show this screen.

`

 // Some notes --> process.stdout.write(" RECORDS INSERTED: Total = #{records_processed} | Per Second = #{rps} | Percent Complete = %#{pc}          \r");

module.exports = function (argv) {
  return co(function *() {
    let command = _.first(argv['_'])
    argv['_'] = argv['_'].slice(1)
    if (commands[command]) {
      if (command === "clone") {
        console.log(`"clone" is invalid command for Gather. Use "sync"`)
      } else {
        yield commands[command](argv)
      }
    } else {
      console.log(HELPTEXT)
    }

    process.exit()
  })
  .catch(function (err) {
    console.log('ERROR')
    console.log(err)
    process.exit(1)
  })
}
