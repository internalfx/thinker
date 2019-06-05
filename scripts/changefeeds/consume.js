const fs = require("fs");
const r = require("rethinkdbdash")({
    db: "gather"
});
const { getConn } = require("./queue_manager");

const QUEUE = "changes.files_changes";

async function consumer(msg) {
    const conn = await getConn();
    const data = JSON.parse(msg.content);
    
    logToDisk(JSON.stringify(data))
    if (data.type === "add" && data.new_val) {
        try {
            await r.table("files").insert(data.new_val).run();
            conn.ack(msg);
        } catch(e) {
            conn.nack(msg, undefined, false)  // nack({ requeue: false })
        }
    } else if (data.type === "change" && data.new_val) {
        try {
            await r.table("files").get(data.new_val.id).replace(data.new_val).run();
            conn.ack(msg);
        } catch(e) {
            conn.nack(msg, undefined, false)  // nack({ requeue: false })
        }
    } else if (data.type === "remove" && !data.new_val) {
        try {
            await r.table("files").get(data.old_val.id).delete().run();
            conn.ack(msg);
        } catch(e) {
            conn.nack(msg, undefined, false)  // nack({ requeue: false })
        }
    }
}

function logToDisk(str) {
    try {
        fs.appendFileSync("./consumer.log", str + "\n")
    } catch(e) {
        console.log(`Error write ID to disk:`)
        console.log(str)
    }
}

(async () => {
    try {
        const conn = await getConn();
        await conn.consume(QUEUE, consumer)
    } catch (e) {
        console.log("Consumer fail, logging...");
        console.error(e)
    }
})();
