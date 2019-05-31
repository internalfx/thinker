const fs = require("fs");
const r = require("rethinkdbdash")({
    db: "gather"
});
const { getConn } = require("./queue_manager");

const QUEUE = "changes.files_changes";

async function consumer(msg) {
    const conn = await getConn();
    const data = JSON.parse(msg.content);
    
    if (data.type === "add" && data.new_val) {
        try {
            await r.table("files").insert(data.new_val);
            conn.ack(msg);
        } catch(e) {
            conn.nack(msg, undefined, false)  // nack({ requeue: false })
        }
    } else if (data.type === "change") {
        try {
            await r.table("files").replace(data.new_val);
            conn.ack(msg);
        } catch(e) {
            conn.nack(msg, undefined, false)  // nack({ requeue: false })
        }
    } else if (data.type === "remove" && !data.new_val) {
        try {
            await r.table("files").get(data.old_val.id).delete();
            conn.ack(msg);
        } catch(e) {
            conn.nack(msg, undefined, false)  // nack({ requeue: false })
        }
    }
}

(async () => {
    try {
        const conn = await getConn();
        await conn.consume(QUEUE, consumer)
    } catch (e) {
        console.log("Consumer fail, logging...");
        console.error(e)
        // fs.appendFile("./error.log", JSON.stringify(msg) + "\n", (err) => {
        //     if (err) console.log(err);
        //     console.error(e)
        // });
    }
})();
