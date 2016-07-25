
let _ = require('lodash')
let co = require('co')

/* global VERSION */

let HELPTEXT = `

  Thinker ${VERSION}
  ==============================

  A RethinkDB command line tool.

  Commands:
    thinker clone           Clone a database locally or between remote hosts.
    thinker -h | --help     Show this screen.

`

 // Some notes --> process.stdout.write(" RECORDS INSERTED: Total = #{records_processed} | Per Second = #{rps} | Percent Complete = %#{pc}          \r");

module.exports = function (argv) {
  let command = _.first(argv['_'])
  argv['_'] = argv['_'].slice(1)
  if (command === 'clone') {
    require('./clone').run(argv)
  } else {
    console.log(HELPTEXT)
  }

  process.exit()
}
