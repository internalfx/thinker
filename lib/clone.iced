
_ = require('lodash')
r = require('rethinkdb')
async = require('async')
perfNow = require("performance-now")
inquirer = require("inquirer")

HELPTEXT = """

              Thinker Clone
              ==============================

              Clone a RethinkDB database on the same host or between remote hosts.

              Usage:
                thinker clone [options]
                thinker clone --sh host[:port] --th host[:port] --sd dbName --td newDbName
                thinker clone -h | --help

              Options:
                --sh, --sHost=<host[:port]>     Source host, defaults to 'localhost:21015'
                --th, --tHost=<host[:port]>     Target host, defaults to 'localhost:21015'
                --sd, --sourceDB=<dbName>       Source database
                --td, --targetDB=<dbName>       Target database

            """

# Some notes --> process.stdout.write(" RECORDS INSERTED: Total = #{records_processed} | Per Second = #{rps} | Percent Complete = %#{pc}          \r");

exports.run = (argv, done) ->
  sHost = argv.sh ?= if argv.sHost then argv.sHost else 'localhost:28015'
  tHost = argv.th ?= if argv.tHost then argv.tHost else 'localhost:28015'
  sourceHost = _.first(sHost.split(':'))
  targetHost = _.first(tHost.split(':'))
  sourcePort = Number(_.last(sHost.split(':'))) or 28015
  targetPort = Number(_.last(tHost.split(':'))) or 28015
  sourceDB = argv.sd ?= if argv.sourceDB then argv.sourceDB else null
  targetDB = argv.td ?= if argv.targetDB then argv.targetDB else null

  if argv.h or argv.help
    console.log HELPTEXT
    return null

  unless sourceDB? and targetDB?
    console.log "Source and target databases are required!"
    console.log HELPTEXT
    return null

  if "#{sourceHost}:#{sourcePort}" is "#{targetHost}:#{targetPort}" and sourceDB is targetDB
    console.log "Source and target databases must be different if cloning on same server!"
    return null

  await
    inquirer.prompt([{
      type: 'confirm'
      name: 'confirmed'
      message: """Ready to clone!
        The database '#{sourceDB}' on '#{sourceHost}:#{sourcePort}' will be cloned to the '#{targetDB}' database on '#{targetHost}:#{targetPort}'
        This will destroy all data in the '#{targetDB}' database on '#{targetHost}:#{targetPort}' if it exists!
        Proceed?
      """
      default: false
    }], defer(answer))

  unless answer.confirmed
    console.log "ABORT!"
    return null

  directClone = "#{sourceHost}:#{sourcePort}" is "#{targetHost}:#{targetPort}"

  if directClone # Direct clone method
    console.log "Source RethinkDB Server is same as target. Cloning locally on server(this is faster)."
    await r.connect({host: sourceHost, port: sourcePort}, defer(err, conn))

    # Verify source database
    await r.dbList().run(conn, defer(err, dbList))
    unless _.contains(dbList, sourceDB)
      console.log "Source DB does not exist!"
      await conn.close(defer(err, result))
      return null

    await r.dbDrop(targetDB).run(conn, defer(err, result))
    await r.dbCreate(targetDB).run(conn, defer(err, result))

    await r.db(sourceDB).tableList().run(conn, defer(err, sourceTableList))
    console.log "===== CREATE TABLES..."
    await
      for tname in sourceTableList
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
      for tname in sourceTableList
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
      for tname in sourceTableList
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

  else # Remote clone method
    console.log "Source and target databases are on different servers. Cloning over network."
    await
      r.connect({host: sourceHost, port: sourcePort}, defer(err, sourceConn))
      r.connect({host: targetHost, port: targetPort}, defer(err, targetConn))

    # Verify source database
    await r.dbList().run(sourceConn, defer(err, dbList))
    unless _.contains(dbList, sourceDB)
      console.log "Source DB does not exist!"
      await
        sourceConn.close(defer(err, result))
        targetConn.close(defer(err, result))
      return null

    await r.dbDrop(targetDB).run(targetConn, defer(err, result))
    await r.dbCreate(targetDB).run(targetConn, defer(err, result))

    await r.db(sourceDB).tableList().run(sourceConn, defer(err, sourceTableList))

    await
      sourceConn.close(defer(err, result))
      targetConn.close(defer(err, result))

    console.log "===== CREATE TABLES..."
    await
      for tname in sourceTableList
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
      for tname in sourceTableList
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
      for tname in sourceTableList
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

    check_queue = ->
      perf_stat.unshift(records_processed - last_records_processed)
      perf_stat.pop() while perf_stat.length > 25
      rps = (_.reduce(perf_stat, (a, b) -> a + b) / (perf_stat.length*(status_interval/1000))).toFixed(1)
      pc = ((records_processed / total_records) * 100).toFixed(1)
      process.stdout.write(" RECORDS INSERTED: Total = #{records_processed} | Per Second = #{rps} | Percent Complete = %#{pc}          \r");
      last_records_processed = records_processed
      setTimeout(check_queue, status_interval)

    setTimeout(check_queue, status_interval)

    insert_queue.drain = ->
      sourceTableList = _.uniq(sourceTableList)
      if completed_tables.length >= sourceTableList.length
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
      for tname in sourceTableList
        ((cb)->
          table = tname
          await r.connect({host: sourceHost, port: sourcePort}, defer(err, tableConns[table]))
          await r.db(sourceDB).table(table).run(tableConns[table], defer(err, cursors[table]))
          cb()
        )(defer())

    console.log "===== CLONE DATA..."
    await
      for tname in sourceTableList
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
