
let _ = require('lodash')
let Promise = require('bluebird')
let fs = require('fs')
Promise.promisifyAll(fs)
let inquirer = require('inquirer')
let co = require('co')
let colors = require('colors')
let asyncEach = require('../asyncEach')
let blockingQueue = require('../blockingQueue')
let compareValues = require('../compareValues')
let moment = require('moment')

let HELPTEXT = `

  Thinker Sync
  ==============================

  Sync two RethinkDB databases.

  Usage:
    thinker sync [options]
    thinker sync --sh host[:port] --th host[:port] --sd dbName --td dbName
    thinker sync -h | --help

  Options:
    --sh, --sourceHost=<host[:port]>    Source host, defaults to 'localhost:21015'
    --th, --targetHost=<host[:port]>    Target host, defaults to 'localhost:21015'
    --sd, --sourceDB=<dbName>           Source database
    --td, --targetDB=<dbName>           Target database

    --pt, --pickTables=<table1,table2>  Comma separated list of tables to sync (whitelist)
    --ot, --omitTables=<table1,table2>  Comma separated list of tables to ignore (blacklist)
                                        Note: '--pt' and '--ot' are mutually exclusive options.

    --user                              Source and Target username
    --password                          Source and Target password

    --su                                Source username, overrides --user
    --sp                                Source password, overrides --password

    --tu                                Target username, overrides --user
    --tp                                Target password, overrides --password

`

module.exports = function *(argv) {
  let startTime
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
  let sourceUser = argv.su ? argv.su : argv.user ? argv.user : 'admin'
  let sourcePassword = argv.sp ? argv.sp : argv.password ? argv.password : ''
  let targetUser = argv.tu ? argv.tu : argv.user ? argv.user : 'admin'
  let targetPassword = argv.tp ? argv.tp : argv.password ? argv.password : ''

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
    console.log('Source and target databases must be different if syncing on same server!')
    return
  }

  // Verify source database
  let sr = require('rethinkdbdash')({host: sourceHost, port: sourcePort, user: sourceUser, password: sourcePassword})
  // get sourceDBList
  let sourceDBList = yield sr.dbList().run()
  // get sourceTableList
  let sourceTableList = yield sr.db(sourceDB).tableList().run()
  if (!sourceDBList.includes(sourceDB)) {
    console.log('Source DB does not exist!')
    return
  }

  if (pickTables && !_.every(pickTables, (table) => sourceTableList.includes(table))) {
    console.log(colors.red('Not all the tables specified in --pickTables exist!'))
    return
  }

  if (omitTables && !_.every(omitTables, (table) => sourceTableList.includes(table))) {
    console.log(colors.red('Not all the tables specified in --omitTables exist!'))
    return
  }

  let confMessage = `
    ${colors.green('Ready to synchronize!')}
    The database '${colors.yellow(sourceDB)}' on '${colors.yellow(sourceHost)}:${colors.yellow(sourcePort)}' will be synchronized to the '${colors.yellow(targetDB)}' database on '${colors.yellow(targetHost)}:${colors.yellow(targetPort)}'
    This will modify records in the '${colors.yellow(targetDB)}' database on '${colors.yellow(targetHost)}:${colors.yellow(targetPort)}' if it exists!
  `

  if (pickTables) {
    confMessage += `  ONLY the following tables will be synchronized: ${colors.yellow(pickTables.join(','))}\n`
  }
  if (omitTables) {
    confMessage += `  The following tables will NOT be synchronized: ${colors.yellow(omitTables.join(','))}\n`
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

  startTime = moment()

  let tablesToSync
  if (pickTables) {
    tablesToSync = pickTables
  } else if (omitTables) {
    tablesToSync = _.difference(sourceTableList, omitTables)
  } else {
    tablesToSync = sourceTableList
  }

  let tr = require('rethinkdbdash')({host: targetHost, port: targetPort, user: targetUser, password: targetPassword})

  let targetDBList = yield tr.dbList().run()
  if (!targetDBList.includes(targetDB)) {
    console.log('Target DB does not exist, creating...')
    yield tr.dbCreate(targetDB).run()
  }

  let targetDBTableList = yield tr.db(targetDB).tableList().run()

  yield asyncEach(tablesToSync, function *(table, idx) {
    if (!targetDBTableList.includes(table)) {
      console.log(`Table '${table}' does not exist on target, creating...`)
      let primaryKey = yield sr.db(sourceDB).table(table).info()('primary_key').run()
      yield tr.db(targetDB).tableCreate(table, {primaryKey: primaryKey}).run()
    }
  }, 999)

  yield asyncEach(tablesToSync, function *(table, idx) {
    let sourceIndexes = yield sr.db(sourceDB).table(table).indexList().run()
    let targetIndexes = yield tr.db(targetDB).table(table).indexList().run()

    for (let index of sourceIndexes) {
      if (!targetIndexes.includes(index)) {
        console.log(`Index '${index}' does not exist on '${table}' table on target, creating...`)
        let indexObj = yield sr.db(sourceDB).table(table).indexStatus(index).run()
        indexObj = _.first(indexObj)
        yield tr.db(targetDB).table(table).indexCreate(
          indexObj.index, indexObj.function, {geo: indexObj.geo, multi: indexObj.multi}
        ).run()
      }
    }

    yield tr.db(targetDB).table(table).indexWait().run()
  }, 999)

  for (let table of tablesToSync) {
    let totalRecords = yield sr.db(sourceDB).table(table).count().run()
    let recordsProcessed = 0
    let lastRecordsProcessed = 0
    let perfStat = []
    let statusInterval = 500
    let created = 0
    let updated = 0
    let deleted = 0
    let queue = blockingQueue()

    console.log(`Synchronizing ${totalRecords} records in ${table}...                                                                        `)
    let sourceCursor = yield sr.db(sourceDB).table(table).orderBy({index: sr.asc('id')})
      .map(function (row) { return {id: row('id'), hash: sr.uuid(row.toJSON())} })
      .run({cursor: true})
    let targetCursor = yield tr.db(targetDB).table(table).orderBy({index: tr.asc('id')})
      .map(function (row) { return {id: row('id'), hash: tr.uuid(row.toJSON())} })
      .run({cursor: true})

    let si = {}
    let ti = {}

    si = yield getNextIdx(sourceCursor, si)
    ti = yield getNextIdx(targetCursor, ti)

    co(function *() {
      let pc = 0
      while (pc < 100) {
        perfStat.unshift(recordsProcessed - lastRecordsProcessed)
        while (perfStat.length > 30) {
          perfStat.pop()
        }
        let rps = (_.reduce(perfStat, (a, b) => a + b) / (perfStat.length * (statusInterval / 1000))).toFixed(1)
        pc = ((recordsProcessed / totalRecords) * 100).toFixed(1)
        process.stdout.write(` RECORDS SYNCHRONIZED: ${recordsProcessed} | ${rps} sec. | %${pc} | created ${created} | updated ${updated} | deleted ${deleted} | concurrency ${queue.concurrency}                    \r`)
        lastRecordsProcessed = recordsProcessed

        yield Promise.delay(statusInterval)
      }
    })

    while (si.id !== Infinity || ti.id !== Infinity) {
      const cmp = compareValues(si.id, ti.id)

      if (cmp === 0) {  // si.id === ti.id  ->  check hashes
        let sid = si.id
        let tid = ti.id
        if (si.hash !== ti.hash) {
          yield queue.push(function *() {
            let record = yield sr.db(sourceDB).table(table).get(sid).run({timeFormat: 'raw'})
            yield tr.db(targetDB).table(table).get(tid).replace(record).run()
            updated += 1
          })
        }
        si = yield getNextIdx(sourceCursor, si)
        ti = yield getNextIdx(targetCursor, ti)
        recordsProcessed += 1
      } else if (cmp < 0) {  // si.id < ti.id  ->  copy si
        let sid = si.id
        yield queue.push(function *() {
          let record = yield sr.db(sourceDB).table(table).get(sid).run({timeFormat: 'raw'})
          yield tr.db(targetDB).table(table).insert(record).run()
          created += 1
        })
        si = yield getNextIdx(sourceCursor, si)
        recordsProcessed += 1
      } else if (cmp > 0) {  // si.id > ti.id  ->  delete ti
        let tid = ti.id
        yield queue.push(function *() {
          yield tr.db(targetDB).table(table).get(tid).delete().run()
        })
        ti = yield getNextIdx(targetCursor, ti)
        deleted += 1
      } else {
        console.log(colors.red(`ERROR! Cannot sync, encountered uncomparable PKs`))
        break
      }
    }

    yield tr.db(targetDB).table(table).sync().run()
  }

  console.log(colors.green(`DONE! Completed in ${startTime.fromNow(true)}`))
}

var getNextIdx = function *(cursor, idx) {
  if (idx.id !== Infinity) {
    try {
      idx = yield cursor.next()
    } catch (err) {
      if (err.message === 'No more rows in the cursor.') {
        idx = {
          hash: '',
          id: Infinity
        }
      }
    }
  }
  return idx
}
