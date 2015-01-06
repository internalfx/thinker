
_ = require('lodash')
r = require('rethinkdb')
async = require('async')
perfNow = require("performance-now")
inquirer = require("inquirer")
colors = require('colors')

HELPTEXT = """

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

            """

exports.run = (argv, done) ->
  sHost = argv.sh ?= if argv.sourceHost then argv.sourceHost else 'localhost:28015'
  tHost = argv.th ?= if argv.targetHost then argv.targetHost else 'localhost:28015'
  sourceHost = _.first(sHost.split(':'))
  targetHost = _.first(tHost.split(':'))
  sourcePort = Number(_.last(sHost.split(':'))) or 28015
  targetPort = Number(_.last(tHost.split(':'))) or 28015
  sourceDB = argv.sd ?= if argv.sourceDB then argv.sourceDB else null
  targetDB = argv.td ?= if argv.targetDB then argv.targetDB else null
  pickTables = argv.pt ?= if argv.pickTables then argv.pickTables else null
  omitTables = argv.ot ?= if argv.omitTables then argv.omitTables else null

  pickTables = pickTables.split(',') if pickTables?
  omitTables = omitTables.split(',') if omitTables?

  if argv.h or argv.help
    console.log HELPTEXT
    return done()

  if pickTables? and omitTables?
    console.log "pickTables and omitTables are mutually exclusive options."
    return done()

  unless sourceDB? and targetDB?
    console.log "Source and target databases are required!"
    console.log HELPTEXT
    return done()

  if "#{sourceHost}:#{sourcePort}" is "#{targetHost}:#{targetPort}" and sourceDB is targetDB
    console.log "Source and target databases must be different if cloning on same server!"
    return done()

  # Verify source database
  await r.connect({host: sourceHost, port: sourcePort}, defer(err, conn))
  # get dbList
  await r.dbList().run(conn, defer(err, dbList))
  # get sourceTableList
  await r.db(sourceDB).tableList().run(conn, defer(err, sourceTableList))
  await conn.close(defer(err, result))
  unless _.contains(dbList, sourceDB)
    console.log "Source DB does not exist!"
    return done()

  if pickTables? and !_.every(pickTables, (table)-> _.contains(sourceTableList, table))
    console.log colors.red("Not all the tables specified in --pickTables exist!")
    return done()

  if omitTables? and !_.every(omitTables, (table)-> _.contains(sourceTableList, table))
    console.log colors.red("Not all the tables specified in --omitTables exist!")
    return done()

  directClone = "#{sourceHost}:#{sourcePort}" is "#{targetHost}:#{targetPort}"

  await
    confMessage = """#{colors.green("Ready to clone!")}
      The database '#{colors.yellow("#{sourceDB}")}' on '#{colors.yellow("#{sourceHost}")}:#{colors.yellow("#{sourcePort}")}' will be cloned to the '#{colors.yellow("#{targetDB}")}' database on '#{colors.yellow("#{targetHost}")}:#{colors.yellow("#{targetPort}")}'
      This will destroy(drop & create) the '#{colors.yellow("#{targetDB}")}' database on '#{colors.yellow("#{targetHost}")}:#{colors.yellow("#{targetPort}")}' if it exists!\n"""
    if pickTables?
      confMessage += "ONLY the following tables will be copied: #{colors.yellow("#{pickTables.join(',')}")}\n"
    if omitTables?
      confMessage += "The following tables will NOT be copied: #{colors.yellow("#{omitTables.join(',')}")}\n"
    if directClone
      confMessage += "Source RethinkDB Server is same as target. Cloning locally on server(this is faster)."
    else
      confMessage += "Source and target databases are on different servers. Cloning over network."

    console.log confMessage
    inquirer.prompt([{
      type: 'confirm'
      name: 'confirmed'
      message: "Proceed?"
      default: false
    }], defer(answer))

  unless answer.confirmed
    console.log colors.red("ABORT!")
    return done()

  if pickTables?
    tablesToCopyList = pickTables
  else if omitTables?
    tablesToCopyList = _.difference(sourceTableList, omitTables)
  else
    tablesToCopyList = sourceTableList


  if directClone # Direct clone method
    await r.connect({host: sourceHost, port: sourcePort}, defer(err, conn))

    await r.dbDrop(targetDB).run(conn, defer(err, result))
    await r.dbCreate(targetDB).run(conn, defer(err, result))

    console.log "===== CREATE TABLES..."
    await
      for tname in tablesToCopyList
        ((cb) ->
          table = tname
          await r.connect({host: sourceHost, port: sourcePort}, defer(err, localconn))
          await r.db(sourceDB).table(table).info()('primary_key').run(localconn, defer(err, primaryKey))
          await r.db(targetDB).tableCreate(table, {primaryKey: primaryKey}).run(localconn, defer(err, result))
          await localconn.close(defer(err, result))
          console.log "CREATED #{table}"
          cb()
        )(defer())

    console.log "===== SYNC SECONDARY INDEXES..."
    await
      for tname in tablesToCopyList
        ((cb)->
          table = tname
          await r.connect({host: sourceHost, port: sourcePort}, defer(err, localconn))
          await r.db(sourceDB).table(table).indexList().run(localconn, defer(err, sourceIndexes))

          for index in sourceIndexes
            await r.db(sourceDB).table(table).indexStatus(index).run(localconn, defer(err, index_obj))
            index_obj = _.first(index_obj)
            await
              r.db(targetDB).table(table).indexCreate(
                index_obj.index, index_obj.function, {geo: index_obj.geo, multi: index_obj.multi}
              ).run(localconn, defer(err, result))

          await localconn.close(defer(err, result))
          console.log "INDEXES SYNCED #{table}"
          cb()
        )(defer())

    console.log "===== CLONE DATA..."
    await
      for tname in tablesToCopyList
        ((cb)->
          table = tname
          await r.connect({host: sourceHost, port: sourcePort}, defer(err, localconn))

          await r.db(targetDB).table(table).insert(
            r.db(sourceDB).table(table)
          ).run(localconn, defer(err, sourceIndexes))

          await localconn.close(defer(err, result))
          console.log "DATA CLONED #{table}"
          cb()
        )(defer())

    console.log "DONE!"
    await conn.close(defer(err, result))

    return done()

  else # Remote clone method
    await
      r.connect({host: sourceHost, port: sourcePort}, defer(err, sourceConn))
      r.connect({host: targetHost, port: targetPort}, defer(err, targetConn))

    await r.dbDrop(targetDB).run(targetConn, defer(err, result))
    await r.dbCreate(targetDB).run(targetConn, defer(err, result))

    await
      sourceConn.close(defer(err, result))
      targetConn.close(defer(err, result))

    console.log "===== CREATE TABLES..."
    await
      for tname in tablesToCopyList
        ((cb) ->
          table = tname
          await
            r.connect({host: sourceHost, port: sourcePort}, defer(err, localSourceConn))
            r.connect({host: targetHost, port: targetPort}, defer(err, localTargetConn))

          await r.db(sourceDB).table(table).info()('primary_key').run(localSourceConn, defer(err, primaryKey))
          await r.db(targetDB).tableCreate(table, {primaryKey: primaryKey}).run(localTargetConn, defer(err, result))

          await
            localSourceConn.close(defer(err, result))
            localTargetConn.close(defer(err, result))
          console.log "CREATED #{table}"
          cb()
        )(defer())

    console.log "===== SYNC SECONDARY INDEXES..."
    await
      for tname in tablesToCopyList
        ((cb)->
          table = tname
          await r.connect({host: sourceHost, port: sourcePort}, defer(err, sourcelocalconn))
          await r.connect({host: targetHost, port: targetPort}, defer(err, targetlocalconn))
          await r.db(sourceDB).table(table).indexList().run(sourcelocalconn, defer(err, sourceIndexes))

          for index in sourceIndexes
            await r.db(sourceDB).table(table).indexStatus(index).run(sourcelocalconn, defer(err, index_obj))
            index_obj = _.first(index_obj)
            await
              r.db(targetDB).table(table).indexCreate(
                index_obj.index, index_obj.function, {geo: index_obj.geo, multi: index_obj.multi}
              ).run(targetlocalconn, defer(err, result))

          await
            sourcelocalconn.close(defer(err, result))
            targetlocalconn.close(defer(err, result))
          console.log "INDEXES SYNCED #{table}"
          cb()
        )(defer())

    #vars
    concurrency = 50
    queue_ready = true
    records_processed = 0
    last_records_processed = 0
    completed_tables = []
    tableConns = {}
    cursors = {}
    total_records = 0
    perf_stat = [0]
    status_interval = 500

    console.log "===== INSPECT SOURCE DATABASE..."
    await
      for tname in tablesToCopyList
        ((cb)->
          table = tname
          await r.connect({host: sourceHost, port: sourcePort}, defer(err, localconn))
          await r.db(sourceDB).table(table).count().run(localconn, defer(err, size))
          total_records += size
          await localconn.close(defer(err, result))
          cb()
        )(defer())
    console.log "#{total_records} records to copy...."


    insert_queue = async.queue(
      (
        (obj, cb)->
          await r.connect({host: targetHost, port: targetPort}, defer(err, localconn))
          await r.db(targetDB).table(obj.table).insert(obj.data).run(localconn, {durability: 'soft'}, defer(err, result))
          await localconn.close(defer(err, result))
          records_processed += obj.data.length
          cb()
      ), concurrency
    )

    isDone = ->
      return completed_tables.length >= tablesToCopyList.length

    insert_queue.drain = ->
      completed_tables = _.uniq(completed_tables)
      if isDone()
        check_queue()
        #close all cursor connections
        for key in _.keys(tableConns)
          await tableConns[key].close(defer(err, result))
        console.log "\n"
        console.log "DONE!"
        done()

    insert_queue.suturate = ->
      console.log "SATURATED"

    console.log "===== OPEN CURSORS"
    await
      for tname in tablesToCopyList
        ((cb)->
          table = tname
          await r.connect({host: sourceHost, port: sourcePort}, defer(err, tableConns[table]))
          await r.db(sourceDB).table(table).run(tableConns[table], defer(err, cursors[table]))
          cb()
        )(defer())

    check_queue = ->
      perf_stat.unshift(records_processed - last_records_processed)
      perf_stat.pop() while perf_stat.length > 40
      rps = (_.reduce(perf_stat, (a, b) -> a + b) / (perf_stat.length*(status_interval/1000))).toFixed(1)
      pc = ((records_processed / total_records) * 100).toFixed(1)
      process.stdout.write(" RECORDS INSERTED: Total = #{records_processed} | Per Second = #{rps} | Percent Complete = %#{pc}          \r");
      last_records_processed = records_processed
      setTimeout(check_queue, status_interval) unless isDone()

    console.log "===== CLONE DATA..."
    check_queue()
    await
      for tname in tablesToCopyList
        ((cb)->
          table = tname
          table_done = false

          until table_done
            buffer = []
            while buffer.length < 200
              await cursors[table].next(defer(err, row))
              if err
                table_done = true
                completed_tables.push(table)
                break
              else
                buffer.push(row)

            insert_queue.push({table: table, data: _.clone(buffer)})

          cb()
        )(defer())
