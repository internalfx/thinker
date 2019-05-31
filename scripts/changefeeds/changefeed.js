const { publish } = require("./publish");
const { setup } = require("./queue_manager");
const r = require("rethinkdbdash")({
    db: "gather"
});
const RETHINKDB_TABLE = "files";
const PUBLISH_QUEUE = "files_changes";

setup(PUBLISH_QUEUE)
.then(() => {
    r.table(RETHINKDB_TABLE)
        .changes({ includeTypes: true })
        .then(changefeed => {
            changefeed.eachAsync((change) => {
                publish(PUBLISH_QUEUE, change);
            })
        });
});
