
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


    ██████╗  █████╗ ████████╗██╗  ██╗███████╗██████╗ 
    ██╔════╝ ██╔══██╗╚══██╔══╝██║  ██║██╔════╝██╔══██╗
    ██║  ███╗███████║   ██║   ███████║█████╗  ██████╔╝
    ██║   ██║██╔══██║   ██║   ██╔══██║██╔══╝  ██╔══██╗
    ╚██████╔╝██║  ██║   ██║   ██║  ██║███████╗██║  ██║
      ╚═════╝ ╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝
                                                                                                
    --c, --companyIds=<id1,id2>               Uses secondary ids to filter Company Secondary Index from what is synced

    --tt, --targetTable=<tableName>           When copying an existing table to the same server with a new name, this specifies the new table name.
                                                --pt option is required, can only contain a single table, & must be different than '--targetTable' value

    --indexesOnly                             Just create indexes
    --buffer                                  <number> - Minimum number of connections available in the pool, default 20
    --max                                     <number> - Maximum number of connections available in the pool, default 50
    --allMessages                             Pulls all messages instead of last 3 months (default: false)

`


/** Gets a DB cursor to the items filtered by Secondary Index Company
 * @param {*} connection Your connection object to rethinkdb
 * @param {string} database Database name
 * @param {string} table Table name
 */
function getMessages(connection, database, table, companyIds) {
  const query = connection.db(database).table(table)
    .between(moment().subtract(3, 'months').valueOf(), connection.maxval, { index: "create" })
    .orderBy("id")

  if (companyIds) {
    query.filter(doc =>
      connection.expr(companyIds).contains(doc("Company"))
    )
  }
  return query
    .map(function (row) { return {id: row('id'), hash: connection.uuid(row.toJSON())} })
    .run({ cursor: true })
}

/** Gets a DB cursor to the items filtered by Secondary Index Company
 * @param {*} connection Your connection object to rethinkdb
 * @param {string} database Database name
 * @param {string} table Table name
 * @param {string[]} companyIds Array of company ids 
 */
function getByCompany(connection, database, table, companyIds) {
  return connection.db(database).table(table)
    .getAll(...companyIds, { index: 'Company' })
    .orderBy('id')
    .map(function (row) { return {id: row('id'), hash: connection.uuid(row.toJSON())} })
    .run({ cursor: true })
}

/** Gets a DB cursor to the "files" filtering out automatic doc records
 * @param {*} connection Your connection object to rethinkdb
 * @param {string} database Database name
 * @param {string} table Table name
 */
function getFilesWithFilter(connection, database, table) {
  return connection.db(database).table(table)
  .orderBy({index: connection.asc('id')})
  .filter(doc => doc("settings")("automatic").ne(true).default(true))
    // return doc.hasFields("settings").not()
    // .or(
    //   doc("settings").hasFields("automatic").not()
    //   )
    // })
    .map(function (row) { return {id: row('id'), hash: connection.uuid(row.toJSON())} })
    .run({ cursor: true })
}

/** Gets a DB cursor to the items filtered by Secondary Index Company
 * @param {*} connection Your connection object to rethinkdb
 * @param {string} database Database name
 * @param {string} table Table name
 * @param {string[]} companyIds Array of company ids 
 */
function getByCreateRange(connection, database, table, createMin, createMax = null) {
  if (!createMin && typeof createMin !== "number") {
    logger.error(colors.red('Must supply lower range create date!'))
  }
  createMax = createMax && typeof createMin !== "number" ? createMax :  connection.maxVal;

  return connection.db(database).table(table)
    .between(createMin, createMax, { index: 'create' })
    .orderBy('id')
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
  let targetTableName = argv.tt ? argv.tt : argv.targetTable ? argv.targetTable : null
  const autoApprove = argv.autoApprove ? argv.autoApprove : null
  const logLevel = argv.logLevel ? parseInt(argv.logLevel, 10) : 0
  const indexesOnly = argv.indexesOnly ? argv.indexesOnly : null
  const buffer = argv.buffer ? parseInt(argv.buffer, 10) : 20
  const max = argv.max ? parseInt(argv.max, 10) : 50
  const allMessages = argv.allMessages ? argv.allMessages : false
  
  pickTables = _.isString(pickTables) ? pickTables.split(',') : null
  omitTables = _.isString(omitTables) ? omitTables.split(',') : null
  companyIds = _.isString(companyIds) ? companyIds.split(',') : null
  COPY_TABLE_MODE = false;

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
    if (pickTables && pickTables.length === 1 && targetTableName) {
      if (targetTableName === pickTables[0]) {
        console.log(`ERROR - Value for '--tt, --targetTable' option must be different than the '--pt, --pickTables' value`)
        return
      }
      // Copy table data from same server to new table named `targetTableName`
      COPY_TABLE_MODE = true;
      console.log(`Copying "${pickTables[0]}" table from ${sourceHost}:${sourcePort} to SAME server as a new table named: "${targetTableName}"`)
    } else {
      console.log('ERROR - Source and target databases must be different if syncing on same server!')
      return
    }
  }

  const logger = getLoggerObject(isNaN(logLevel) ? 0 : logLevel)

  // Verify source database
  let sr = require('rethinkdbdash')({
    host: sourceHost,
    port: sourcePort,
    user: sourceUser,
    password: sourcePassword,
    timeout: 10,
    timeoutError: 60000, // Wait 60 seconds before trying to reconnect in case of an error
    timeoutGb: 600,
    buffer: buffer,
    max: max,
    silent: false
  })
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
    if (targetTableName) {
      confMessage += `    \n`
      confMessage += `    Source table ${colors.yellow(pickTables.join(','))} will be copied to a new table named: ${colors.cyan(targetTableName)}\n`
      confMessage += `    This will NOT alter contents of the source table ${colors.yellow(pickTables.join(','))} on ${colors.yellow(sourceHost + ":" + sourcePort)}\n`
    }
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
  
  let tablesToSyncArray
  if (pickTables) {
    tablesToSyncArray = pickTables
  } else if (omitTables) {
    tablesToSyncArray = _.difference(sourceTableList, omitTables)
  } else {
    tablesToSyncArray = sourceTableList
  }

  const tablesManager = {}
  for (const key of tablesToSyncArray) {
    tablesManager[key] = {};
  }

  let tr = require('rethinkdbdash')({
    host: targetHost,
    port: targetPort,
    user: targetUser,
    password: targetPassword,
    timeout: 10,
    timeoutError: 60000, // Wait 60 seconds before trying to reconnect in case of an error
    timeoutGb: 600,
    buffer: buffer,
    max: max,
    silent: false
  })

  let targetDBList = yield tr.dbList().run()
  if (!targetDBList.includes(targetDB)) {
    logger.info('Target DB does not exist, creating...')
    yield tr.dbCreate(targetDB).run()
  }

  let targetDBTableList = yield tr.db(targetDB).tableList().run()

  yield asyncEach(Object.keys(tablesManager), function *(table, idx) {
    const targetTable = COPY_TABLE_MODE ? targetTableName : table
    if (!targetDBTableList.includes(targetTable)) {
      logger.info(`Table '${table}' does not exist on target, creating...`)
      let primaryKey = yield sr.db(sourceDB).table(table).info()('primary_key').run()
      yield tr.db(targetDB).tableCreate(targetTable, {primaryKey: primaryKey}).run()
    }
  }, 999)

  yield asyncEach(Object.keys(tablesManager), function *(table, idx) {
    const targetTable = COPY_TABLE_MODE ? targetTableName : table
    let sourceIndexes = yield sr.db(sourceDB).table(table).indexList().run()
    let targetIndexes = yield tr.db(targetDB).table(targetTable).indexList().run()

    for (let index of sourceIndexes) {
      if (!targetIndexes.includes(index)) {
        logger.info(`Index '${index}' does not exist on '${table}' table on target, creating...`)
        let indexObj = yield sr.db(sourceDB).table(table).indexStatus(index).run()
        indexObj = _.first(indexObj)
        yield tr.db(targetDB).table(targetTable).indexCreate(
          indexObj.index, indexObj.function, {geo: indexObj.geo, multi: indexObj.multi}
        ).run()
      }
    }
    tablesManager[table].indexes = sourceIndexes
    yield tr.db(targetDB).table(targetTable).indexWait().run()
  }, 999)

  if (!indexesOnly) {
    for (let table of Object.keys(tablesManager)) {
      const targetTable = COPY_TABLE_MODE ? targetTableName : table  // 🚨 HACK ALERT 🚨 only used by copying data to table with new name
      let totalRecordsSource
      let totalRecordsTarget
      let additionalMessage
      if (table === "files") {
        totalRecordsSource = 79000000  // not important...
        totalRecordsTarget = 79000000  // not important...
        additionalMessage = `filtering out "automatic" doc records`
      } else if (companyIds) {
        if (!tablesManager[table].indexes.includes("Company")) {
          logger.info(`Skipping table ${table} because it has no secondary index Company`)
          continue
        }
        totalRecordsSource = yield sr.db(sourceDB).table(table).getAll(...companyIds, { index: "Company" }).count().run()
        totalRecordsTarget = yield tr.db(targetDB).table(table).getAll(...companyIds, { index: "Company" }).count().run()
        additionalMessage = `by Companies: ${companyIds}`
      } else {
        totalRecordsSource = yield sr.db(sourceDB).table(table).count().run()
      }
      let recordsProcessed = 0
      let lastRecordsProcessed = 0
      let perfStat = []
      let statusInterval = 500
      let created = 0
      let updated = 0
      let deleted = 0
      let queue = blockingQueue()
      
      logger.info(`Synchronizing from ${totalRecordsSource} records in ${table} from DB ${sourceDB} with ${totalRecordsTarget ? `${totalRecordsTarget} on ` : ''}${table} from DB ${targetDB} ${additionalMessage ? additionalMessage : ''}...      `)
      let sourceCursor
      let targetCursor
  
      if (table === "files") {
        console.log(`Synchronizing files (filtering out "automatic" docs)`)
        sourceCursor = yield getFilesWithFilter(sr, sourceDB, table)
        targetCursor = yield getFilesWithFilter(tr, targetDB, targetTable)
      } else if (table === "messages" && allMessages === false) {
        console.log(`Synchronizing last 3 months of Messages`)
        sourceCursor = yield getMessages(sr, sourceDB, table, companyIds)
        targetCursor = yield getMessages(tr, targetDB, table, companyIds)
      } else if (companyIds) {
        console.log(`Synchronizing by Companies: ${companyIds}`)
        sourceCursor = yield getByCompany(sr, sourceDB, table, companyIds)
        targetCursor = yield getByCompany(tr, targetDB, table, companyIds)
      } else {
        console.log(`Synchronizing everything`)
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
              yield tr.db(targetDB).table(targetTable).get(tid).replace(record).run()
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
            yield tr.db(targetDB).table(targetTable).insert(record).run()
            created += 1
          })
          si = yield getNextIdx(sourceCursor, si)
          recordsProcessed += 1
        } else if (cmp > 0) {  // si.id > ti.id  ->  delete ti
          let tid = ti.id
          yield queue.push(function *() {
            yield tr.db(targetDB).table(targetTable).get(tid).delete().run()
          })
          ti = yield getNextIdx(targetCursor, ti)
          deleted += 1
        } else {
          logger.error(colors.red(`ERROR! Cannot sync, encountered uncomparable PKs`))
          break
        }
      }
  
      yield tr.db(targetDB).table(targetTable).sync().run()
    }
  }
  let msg = `DONE! Completed in ${startTime.fromNow(true)}`
  if (pickTables) {
    msg = `${msg} for Tables: ${JSON.stringify(pickTables)}`
  }
  if (omitTables) {
    msg = `${msg} without Tables: ${JSON.stringify(omitTables)}`
  }
  logger.info(colors.green(msg));
  sr.getPoolMaster().drain();
  tr.getPoolMaster().drain();
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
