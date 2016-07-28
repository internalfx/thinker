
let _ = require('lodash')
// let Promise = require('bluebird')
let inquirer = require('inquirer')
let co = require('co')
let colors = require('colors')
let asyncEach = require('../asyncEach')

let HELPTEXT = `

  Thinker Sync
  ==============================

  Sync two RethinkDB databases.

  Usage:
    thinker clone [options]
    thinker clone --sh host[:port] --th host[:port] --sd dbName --td newDbName
    thinker clone -h | --help

  Options:
    --sh, --sourceHost=<host[:port]>    Source host, defaults to 'localhost:21015'
    --th, --targetHost=<host[:port]>    Target host, defaults to 'localhost:21015'
    --sd, --sourceDB=<dbName>           Source database
    --td, --targetDB=<dbName>           Target database

    --pt, --pickTables=<table1,table2>  Comma separated list of tables to copy (whitelist)
    --ot, --omitTables=<table1,table2>  Comma separated list of tables to ignore (blacklist)
                                        Note: '--pt' and '--ot' are mutually exclusive options.

`

module.exports = function *(argv) {
  let sHost = argv.sh ? argv.sh : argv.sourceHost ? argv.sourceHost : 'localhost:28015'
  let tHost = argv.th ? argv.th : argv.targetHost ? argv.targetHost : 'localhost:28015'
  let sourceHost = _.first(sHost.split(':'))
  let targetHost = _.first(tHost.split(':'))
  let sourcePort = parseInt(_.last(sHost.split(':')), 10) || 28015
  let targetPort = parseInt(_.last(tHost.split(':')), 10) || 28015
  let sourceDB = argv.sd ? argv.sd : argv.sourceDB ? argv.sourceDB : null
  let targetDB = argv.td ? argv.td : argv.targetDB ? argv.targetDB : null
  let pickTables = argv.pt ? argv.pt : argv.pickTables ? argv.pickTables : null
  let omitTables = argv.ot ? argv.ot : argv.omitTables ? argv.omitTables : null

  pickTables = _.isString(pickTables) ? pickTables.split(',') : null
  omitTables = _.isString(omitTables) ? omitTables.split(',') : null

  if (argv.h || argv.help) {
    console.log(HELPTEXT)
    return
  }

  if (pickTables && omitTables) {
    console.log('pickTables and omitTables are mutually exclusive options.')
    return
  }

  if (!sourceDB || !targetDB) {
    console.log('Source and target databases are required!')
    console.log(HELPTEXT)
    return
  }

  if (`${sourceHost}:${sourcePort}` === `${targetHost}:${targetPort}` && sourceDB === targetDB) {
    console.log('Source and target databases must be different if cloning on same server!')
    return
  }

  // Verify source database
  let r = require('rethinkdbdash')({host: sourceHost, port: sourcePort})
  // get dbList
  let dbList = yield r.dbList().run()
  // get sourceTableList
  let sourceTableList = yield r.db(sourceDB).tableList().run()
  if (!dbList.includes(sourceDB)) {
    console.log('Source DB does not exist!')
    return
  }

  if (pickTables && !_.every(pickTables, (table) => _.contains(sourceTableList, table))) {
    console.log(colors.red('Not all the tables specified in --pickTables exist!'))
    return
  }

  if (omitTables && !_.every(omitTables, (table) => _.contains(sourceTableList, table))) {
    console.log(colors.red('Not all the tables specified in --omitTables exist!'))
    return
  }

  let directClone = `${sourceHost}:${sourcePort}` === `${targetHost}:${targetPort}`

  let confMessage = `
    ${colors.green('Ready to clone!')}
    The database '${colors.yellow(sourceDB)}' on '${colors.yellow(sourceHost)}:${colors.yellow(sourcePort)}' will be synchronized to the '${colors.yellow(targetDB)}' database on '${colors.yellow(targetHost)}:${colors.yellow(targetPort)}'
    This will modify records in the '${colors.yellow(targetDB)}' database on '${colors.yellow(targetHost)}:${colors.yellow(targetPort)}' if it exists!
  `

  if (pickTables) {
    confMessage += `  ONLY the following tables will be synchronized: ${colors.yellow(pickTables.join(','))}\n`
  }
  if (omitTables) {
    confMessage += `  The following tables will NOT be synchronized: ${colors.yellow(omitTables.join(','))}\n`
  }
  if (directClone) {
    confMessage += `  Source RethinkDB Server is same as target. Synchronizing locally on server(this is faster).\n`
  } else {
    confMessage += `  Source and target databases are on different servers. Synchronizing over network.\n`
  }

  console.log(confMessage)

  let answer = yield inquirer.prompt([{
    type: 'confirm',
    name: 'confirmed',
    message: 'Proceed?',
    default: false
  }])

  if (!answer.confirmed) {
    console.log(colors.red('ABORT!'))
    return
  }

  let tablesToCopyList
  if (pickTables) {
    tablesToCopyList = pickTables
  } else if (omitTables) {
    tablesToCopyList = _.difference(sourceTableList, omitTables)
  } else {
    tablesToCopyList = sourceTableList
  }

}
