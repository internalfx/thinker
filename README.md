# ThinkSyThinkSync

### A RethinkDB management tool.

[![npm version](https://img.shields.io/npm/v/thinksync.svg)](https://www.npmjs.com/package/thinksync) [![license](https://img.shields.io/npm/l/thinksync.svg)](https://github.com/internalfx/thinksync/blob/master/LICENSE)

A command line tool to ease development and administration.

This is a fork of Thinker for RethinkDB, with one extra feature: The `--ixo`
flag (or `--indexOnly`) causes `thinksync` to only synchronize indexes, ignoring
table data.

One other change is that the `sync` command is not the default command, so you
don't have to pass it.

### FAQ

_Doesn't RethinkDB already have `dump` and `restore` commands for handling this?_

The default `sync` command runs a hashing function on the tables in both databases and only modifies the data that is different, saving tons of bandwidth and time. For example, I regularly update a local copy of a production database for development. The database is 20GB in size, I can `sync` the changes over a ~25mb link in about 20 minutes.

ThinkSync's `clone` command can dump and restore in one step (even to remote databases). `clone` can also target a different database on the same server.

---

Special thanks to [Arthur Andrew Medical](http://www.arthurandrew.com/) for sponsoring this project.

Arthur Andrew Medical manufactures products with ingredients that have extensive clinical research for safety and efficacy. We specialize in Enzymes, Probiotics and Antioxidants.

---

### Installation.

Required nodejs v6+

`npm install -g thinksync`

## Documentation

### Synchronize two RethinkDB databases.

`thinksync` Synchronizes tables, indexes and data from the source database to the target database. The target database is modified to match the source.

```bash
ThinkSync
==============================

Sync two RethinkDB databases.

Usage:
  thinksync [sync] [options]
  thinksync [sync] --sh host[:port] --th host[:port] --sd dbName --td dbName
  thinksync [sync] -h | --help

Options:
  --sh, --sourceHost=<host[:port]>    Source host, defaults to 'localhost:21015'
  --th, --targetHost=<host[:port]>    Target host, defaults to 'localhost:21015'
  --sd, --sourceDB=<dbName>           Source database
  --td, --targetDB=<dbName>           Target database

  --pt, --pickTables=<table1,table2>  Comma separated list of tables to sync (whitelist)
  --ot, --omitTables=<table1,table2>  Comma separated list of tables to ignore (blacklist)
                                      Note: '--pt' and '--ot' are mutually exclusive options.
  --ixo, --indexOnly                  Only sync table indexes, not data.

  --user                              Source and Target username
  --password                          Source and Target password

  --su                                Source username, overrides --user
  --sp                                Source password, overrides --password

  --tu                                Target username, overrides --user
  --tp                                Target password, overrides --password
```

### Clone a RethinkDB database.

`thinksync clone` directly copies tables, indexes and data from the source database to the target database. The target database is dropped and recreated.

```bash
ThinkSync Clone
==============================

Clone a RethinkDB database on the same host or between remote hosts.

Usage:
  thinksync clone [options]
  thinksync clone --sh host[:port] --th host[:port] --sd dbName --td newDbName
  thinksync clone -h | --help

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
