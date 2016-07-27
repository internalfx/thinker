
let _ = require('lodash')
// let Promise = require('bluebird')
let inquirer = require('inquirer')
let co = require('co')
let colors = require('colors')
let asyncEach = require('../asyncEach')

let HELPTEXT = `

  Thinker Clone
  ==============================

  Clone a RethinkDB database on the same host or between remote hosts.

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
    The database '${colors.yellow(sourceDB)}' on '${colors.yellow(sourceHost)}:${colors.yellow(sourcePort)}' will be cloned to the '${colors.yellow(targetDB)}' database on '${colors.yellow(targetHost)}:${colors.yellow(targetPort)}'
    This will destroy(drop & create) the '${colors.yellow(targetDB)}' database on '${colors.yellow(targetHost)}:${colors.yellow(targetPort)}' if it exists!
  `

  if (pickTables) {
    confMessage += `  ONLY the following tables will be copied: ${colors.yellow(pickTables.join(','))}\n`
  }
  if (omitTables) {
    confMessage += `  The following tables will NOT be copied: ${colors.yellow(omitTables.join(','))}\n`
  }
  if (directClone) {
    confMessage += `  Source RethinkDB Server is same as target. Cloning locally on server(this is faster).\n`
  } else {
    confMessage += `  Source and target databases are on different servers. Cloning over network.\n`
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

  if (directClone) { // Direct clone method
    try {
      yield r.dbDrop(targetDB).run()
    } catch (err) {}
    yield r.dbCreate(targetDB).run()

    console.log('===== CREATE TABLES...')
    yield asyncEach(tablesToCopyList, function *(table, idx) {
      let primaryKey = yield r.db(sourceDB).table(table).info()('primary_key').run()
      yield r.db(targetDB).tableCreate(table, {primaryKey: primaryKey}).run()
      console.log(`CREATED ${table}`)
    })

    console.log('===== SYNCHRONIZE SECONDARY INDEXES...')
    yield asyncEach(tablesToCopyList, function *(table, idx) {
      let sourceIndexes = yield r.db(sourceDB).table(table).indexList().run()

      for (let index of sourceIndexes) {
        let index_obj = yield r.db(sourceDB).table(table).indexStatus(index).run()
        index_obj = _.first(index_obj)
        yield r.db(targetDB).table(table).indexCreate(
          index_obj.index, index_obj.function, {geo: index_obj.geo, multi: index_obj.multi}
        ).run()
      }

      yield r.db(targetDB).table(table).indexWait().run()
      console.log(`INDEXES SYNCED ${table}`)
    })
    console.log('===== CLONE DATA...')
    yield asyncEach(tablesToCopyList, function *(table, idx) {
      yield r.db(targetDB).table(table).insert(r.db(sourceDB).table(table)).run()
      console.log(`DATA CLONED ${table}`)
    })

    console.log(colors.green('DONE!'))
  } else { // Remote clone method

    let sr = require('rethinkdbdash')({host: sourceHost, port: sourcePort})
    let tr = require('rethinkdbdash')({host: targetHost, port: targetPort})

    try {
      yield tr.dbDrop(targetDB).run()
    } catch (err) {}
    yield tr.dbCreate(targetDB).run()

    console.log('===== CREATE TABLES...')
    yield asyncEach(tablesToCopyList, function *(table, idx) {
      let primaryKey = yield sr.db(sourceDB).table(table).info()('primary_key').run()
      yield tr.db(targetDB).tableCreate(table, {primaryKey: primaryKey}).run()
      console.log(`CREATED ${table}`)
    })

    console.log('===== SYNCHRONIZE SECONDARY INDEXES...')
    yield asyncEach(tablesToCopyList, function *(table, idx) {
      let sourceIndexes = yield sr.db(sourceDB).table(table).indexList().run()

      for (let index of sourceIndexes) {
        let index_obj = yield sr.db(sourceDB).table(table).indexStatus(index).run()
        index_obj = _.first(index_obj)
        yield tr.db(targetDB).table(table).indexCreate(
          index_obj.index, index_obj.function, {geo: index_obj.geo, multi: index_obj.multi}
        ).run()
      }

      yield tr.db(targetDB).table(table).indexWait().run()
      console.log(`INDEXES SYNCED ${table}`)
    })

    // vars
    let done = false
    let total_records = 0
    let records_processed = 0
    let last_records_processed = 0
    let perf_stat = []
    let status_interval = 500

    console.log('===== INSPECT SOURCE DATABASE...')
    yield asyncEach(tablesToCopyList, function *(table, idx) {
      let size = yield sr.db(sourceDB).table(table).count().run()
      total_records += size
    })
    console.log(`${total_records} records to copy....`)

    co(function *() {
      while (true) {
        perf_stat.unshift(records_processed - last_records_processed)
        while (perf_stat.length > 40) {
          perf_stat.pop()
        }
        let rps = (_.reduce(perf_stat, (a, b) => a + b) / (perf_stat.length * (status_interval / 1000))).toFixed(1)
        let pc = ((records_processed / total_records) * 100).toFixed(1)
        process.stdout.write(` RECORDS INSERTED: Total = ${records_processed} | Per Second = ${rps} | Percent Complete = %${pc}          \r`)
        last_records_processed = records_processed

        yield Promise.delay(status_interval)
        if (done) { break }
      }
    })

    yield asyncEach(tablesToCopyList, function *(table, idx) {
      let cursor = yield sr.db(sourceDB).table(table).run({cursor: true})

      yield cursor.eachAsync(function (record) {
        return co(function *() {
          yield tr.db(targetDB).table(table).insert(record).run({durability: 'soft'})
          records_processed += 1
        })
      })

      yield tr.db(targetDB).table(table).sync().run()

      console.log(colors.green(`'${table}' cloned`))
    }, 9999)

    done = true
    console.log(colors.green('DONE!'))
  }
}
