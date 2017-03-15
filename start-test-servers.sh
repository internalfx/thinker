docker pull rethinkdb:2.3

./stop-test-servers.sh

docker run -d -p 8080:8080 -p 28015:28015 -p 29015:29015 --name rethinkdb-thinker1 -v "$PWD/ignored_files/rethinkdb1:/data" rethinkdb:2.3 rethinkdb --cache-size 2048 --bind all
docker run -d -p 8081:8080 -p 28016:28015 -p 29016:29015 --name rethinkdb-thinker2 -v "$PWD/ignored_files/rethinkdb2:/data" rethinkdb:2.3 rethinkdb --cache-size 2048 --bind all
