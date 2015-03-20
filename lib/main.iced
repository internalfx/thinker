
_ = require('lodash')

HELPTEXT = """

              Thinker #{VERSION}
              ==============================

              A RethinkDB command line tool.

              Commands:
                thinker clone           Clone a database locally or between remote hosts.
                thinker -h | --help     Show this screen.

            """

# Some notes --> process.stdout.write(" RECORDS INSERTED: Total = #{records_processed} | Per Second = #{rps} | Percent Complete = %#{pc}          \r");

exports.run = (argv) ->
  command = _.first(argv['_'])
  argv['_'] = argv['_'].slice(1)
  switch command
    when "clone"
      await require('./clone').run(argv, defer())
    else
      console.log HELPTEXT

  process.exit()
