
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
    --sh, --sourceHost=<host[:port]>          Source host, defaults to 'localhost:21015'
    --th, --targetHost=<host[:port]>          Target host, defaults to 'localhost:21015'
    --sd, --sourceDB=<dbName>                 Source database
    --td, --targetDB=<dbName>                 Target database

    --pt, --pickTables=<table1,table2>        Comma separated list of tables to sync (whitelist)
    --ot, --omitTables=<table1,table2>        Comma separated list of tables to ignore (blacklist)
                                              Note: '--pt' and '--ot' are mutually exclusive options.

    --user                                    Source and Target username
    --password                                Source and Target password

    --su                                      Source username, overrides --user
    --sp                                      Source password, overrides --password

    --tu                                      Target username, overrides --user
    --tp                                      Target password, overrides --password

    --autoApprove                             Skip interactive approval

    --logLevel                                0 (Default) = ALL
                                              1 = No Progress Log
                                              2 = Errors Only
                                              3 = No logs

    --c, --companyIds=<id1,id2>               Uses secondary ids to filter Company Secondary Index from what is synced

    --indexesOnly                             Just create indexes
`

/** Gets a DB cursor to the items filtered by Secondary Index Company
 * @param {*} connection Your connection object to rethinkdb
 * @param {string} database Database name
 * @param {string} table Table name
 * @param {string[]} companyIds Array of company ids 
 */
function getByCompany(connection, database, table, companyIds) {
  return connection.db(database).table(table)
    .orderBy({index: "id"})
    .filter(doc =>
      connection.expr(companyIds).contains(doc("Company"))
    )
    .map(function (row) { return {id: row('id'), hash: connection.uuid(row.toJSON())} })
    .run({ cursor: true })
}

/** Gets a DB cursor to the items of a table
 * @param {*} connection Your connection object to rethinkdb
 * @param {string} database Database name
 * @param {string} table Table name
 */
function getInOrder(connection, database, table) {
  return connection.db(database).table(table)
    .orderBy({index: connection.asc('id')})
    .map(function (row) { return {id: row('id'), hash: connection.uuid(row.toJSON())} })
    .run({cursor: true})
}

/**
 * @typedef {Object} loggerObject
 * @function stdout
 * @param {any} msg Injects to process.stdout directly
 * @function info
 * @param {any} msg The message to put in stdout
 * @function error
 * @param {any} msg The message to put in stderr
 */

/** Global logger
 * @param {number} level Desired logger level 0 (Default) = ALL
                                              1 = No Progress Log
                                              2 = Errors Only
                                              3 = No logs
 * @returns {loggerObject} 
 */
function getLoggerObject(level = 0) {
  return {
    stdout: (msg) => {
      if (level === 0) {
        process.stdout.write(msg)
      }
    },
    info: (msg) => {
      if (level <= 1) {
        console.log(msg)
      }
    },
    error: (msg) => {
      if (level <= 2) {
        console.error(msg) 
      }
    }
  }
}

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
  let companyIds = argv.c ? argv.c : argv.companyIds ? argv.companyIds : null
  const autoApprove = argv.autoApprove ? argv.autoApprove : null
  const logLevel = argv.logLevel ? parseInt(argv.logLevel, 10) : 0
  const indexesOnly = argv.indexesOnly ? argv.indexesOnly : null

  pickTables = _.isString(pickTables) ? pickTables.split(',') : null
  omitTables = _.isString(omitTables) ? omitTables.split(',') : null
  companyIds = _.isString(companyIds) ? companyIds.split(',') : null

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

  const logger = getLoggerObject(isNaN(logLevel) ? 0 : logLevel)

  // Verify source database
  let sr = require('rethinkdbdash')({host: sourceHost, port: sourcePort, user: sourceUser, password: sourcePassword})
  // get sourceDBList
  let sourceDBList = yield sr.dbList().run()
  // get sourceTableList
  let sourceTableList = yield sr.db(sourceDB).tableList().run()
  if (!sourceDBList.includes(sourceDB)) {
    logger.error('Source DB does not exist!')
    return
  }

  if (pickTables && !_.every(pickTables, (table) => sourceTableList.includes(table))) {
    logger.error(colors.red('Not all the tables specified in --pickTables exist!'))
    return
  }

  if (omitTables && !_.every(omitTables, (table) => sourceTableList.includes(table))) {
    logger.error(colors.red('Not all the tables specified in --omitTables exist!'))
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

  logger.info(confMessage)

  if (!autoApprove) {

    let answer = yield inquirer.prompt([{
      type: 'confirm',
      name: 'confirmed',
      message: 'Proceed?',
      default: false
    }])

    if (!answer.confirmed) {
      logger.error(colors.red('ABORT!'))
      return
    }

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
    logger.info('Target DB does not exist, creating...')
    yield tr.dbCreate(targetDB).run()
  }

  let targetDBTableList = yield tr.db(targetDB).tableList().run()

  yield asyncEach(tablesToSync, function *(table, idx) {
    if (!targetDBTableList.includes(table)) {
      logger.info(`Table '${table}' does not exist on target, creating...`)
      let primaryKey = yield sr.db(sourceDB).table(table).info()('primary_key').run()
      yield tr.db(targetDB).tableCreate(table, {primaryKey: primaryKey}).run()
    }
  }, 999)

  yield asyncEach(tablesToSync, function *(table, idx) {
    let sourceIndexes = yield sr.db(sourceDB).table(table).indexList().run()
    let targetIndexes = yield tr.db(targetDB).table(table).indexList().run()

    for (let index of sourceIndexes) {
      if (!targetIndexes.includes(index)) {
        logger.info(`Index '${index}' does not exist on '${table}' table on target, creating...`)
        let indexObj = yield sr.db(sourceDB).table(table).indexStatus(index).run()
        indexObj = _.first(indexObj)
        yield tr.db(targetDB).table(table).indexCreate(
          indexObj.index, indexObj.function, {geo: indexObj.geo, multi: indexObj.multi}
        ).run()
      }
    }

    yield tr.db(targetDB).table(table).indexWait().run()
  }, 999)

  if (!indexesOnly) {
    for (let table of tablesToSync) {
      const totalRecordsSource = yield sr.db(sourceDB).table(table).count().run()
      const totalRecordsTarget = yield tr.db(targetDB).table(table).count().run()
      let recordsProcessed = 0
      let lastRecordsProcessed = 0
      let perfStat = []
      let statusInterval = 500
      let created = 0
      let updated = 0
      let deleted = 0
      let queue = blockingQueue()
      
      logger.info(`Synchronizing ${totalRecordsSource} records in ${table} from DB ${sourceDB} with ${totalRecordsTarget} records in ${table} from DB ${targetDB}...      `)
      let sourceCursor
      let targetCursor
  
      if (companyIds) {
        logger.info(`Synchronizing by Companies: ${companyIds}`)
        sourceCursor = yield getByCompany(sr, sourceDB, table, companyIds)
        targetCursor = yield getByCompany(tr, targetDB, table, companyIds)
      } else {
        sourceCursor = yield getInOrder(sr, sourceDB, table)
        targetCursor = yield getInOrder(tr, targetDB, table)
      }
  
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
          pc = ((recordsProcessed / totalRecordsSource) * 100).toFixed(1)
          logger.stdout(` RECORDS SYNCHRONIZED: ${recordsProcessed} | ${rps} sec. | %${pc} | created ${created} | updated ${updated} | deleted ${deleted} | concurrency ${queue.concurrency}                    \r`)
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
          logger.error(colors.red(`ERROR! Cannot sync, encountered uncomparable PKs`))
          break
        }
      }
  
      yield tr.db(targetDB).table(table).sync().run()
    }
  }
  let msg = `DONE! Completed in ${startTime.fromNow(true)}`
  if (pickTables) {
    msg = `${msg} for Tables: ${JSON.stringify(pickTables)}`
  }
  if (omitTables) {
    msg = `${msg} without Tables: ${JSON.stringify(omitTables)}`
  }
  logger.info(colors.green(msg))
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
