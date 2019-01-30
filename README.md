# Thinker

### A RethinkDB management tool.

[![npm version](https://img.shields.io/npm/v/thinker.svg)](https://www.npmjs.com/package/thinker) [![license](https://img.shields.io/npm/l/thinker.svg)](https://github.com/internalfx/thinker/blob/master/LICENSE)

A command line tool to ease development and administration.

### FAQ

_Doesn't RethinkDB already have `dump` and `restore` commands for handling this?_

Thinker's `clone` command can dump and restore in one step (even to remote databases). `clone` can also target a different database on the same server.

The `sync` command is different entirely, `sync` runs a hashing function on the tables in both databases and only modifies the data that is different, saving tons of bandwidth and time. For example, I regularly update a local copy of a production database for development. The database is 20GB in size, I can `sync` the changes over a ~25mb link in about 20 minutes.

---

Special thanks to [Arthur Andrew Medical](http://www.arthurandrew.com/) for sponsoring this project.

Arthur Andrew Medical manufactures products with ingredients that have extensive clinical research for safety and efficacy. We specialize in Enzymes, Probiotics and Antioxidants.

---

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

### Synchronize two RethinkDB databases without deleting target records that already exist.

`thinker syncinc` Synchronizes tables, indexes and data from the source database to the target database. The target database is modified to match the source but no records from target are deleted.

```bash
Thinker Sync
==============================

Sync two RethinkDB databases (without deleting target records).

Usage:
  thinker syncinc [options]
  thinker syncinc --sh host[:port] --th host[:port] --sd dbName --td dbName
  thinker syncinc -h | --help

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
