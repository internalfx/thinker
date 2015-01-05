Thinker
=======

###A RethinkDB management tool.

A command line tool to ease development, and administration.

###Why?
I have a production app using RethinkDB, and I wanted an easy way to clone the database to another server for development.

###So all it can do is clone databases?
Yep. But I plan on adding other tools that I and the community find useful.

###How do I use it?
````bash
thinker clone [options]
thinker clone --sh host[:port] --th host[:port] --sd dbName --td newDbName
thinker clone -h | --help

Options:
--sh, --sHost=<host[:port]>     Source host, defaults to 'localhost:21015'
--th, --tHost=<host[:port]>     Target host, defaults to 'localhost:21015'
--sd, --sourceDB=<dbName>       Source database
--td, --targetDB=<dbName>       Target database
````

###How do I get it?
`npm install thinker`
