# Thinker

### A RethinkDB management tool.

[![npm version](https://img.shields.io/npm/v/thinker.svg)](https://www.npmjs.com/package/thinker) [![license](https://img.shields.io/npm/l/thinker.svg)](https://github.com/internalfx/thinker/blob/master/LICENSE)

A command line tool to ease development and administration.

### Installation.

Required nodejs v6+

`npm install -g thinker`

## Documentation

### Clone a RethinkDB database.

`thinker clone` directly copies tables, indexes and data from the source database to the target database. The target database is dropped and recreated.

```bash
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

  --user                              Source and Target username
  --password                          Source and Target password

  --su                                Source username, overrides --user
  --sp                                Source password, overrides --password

  --tu                                Target username, overrides --user
  --tp                                Target password, overrides --password
```

### Synchronize two RethinkDB databases.

`thinker sync` Synchronizes tables, indexes and data from the source database to the target database. The target database is modified to match the source.

```bash
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
```
