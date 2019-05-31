const r = require("rethinkdbdash")({
    db: "gather"
});
const { getConn } = require("./queue_manager");

async function consumer(msg) {
    const data = JSON.parse(msg.content);
    
    if (data.type === "change" || (data.type === "add" && data.new_val)) {
        try {
            await r.table("files").insert(data.new_val);
        } catch(e) {
            channel.nack(msg, undefined, false)  // nack({ requeue: false })
        }
    } else if (data.type === "remove" && !data.new_val) {
        try {
            await r.table("files").get(data.old_val.id).delete();
        } catch(e) {
            channel.nack(msg, undefined, false)  // nack({ requeue: false })
        }
    }
}

module.exports = {
    consume: async function consume(queue) {
        try {
            const conn = await getConn();
            conn.consume(queue, consumer)
        } catch (e) {
            console.log("Change not publish, logging...");
            fs.appendFile("./error.log", JSON.stringify(msg) + "\n", (err) => {
                if (err) console.log(err);
                console.error(e)
            });
        }
    }
};
