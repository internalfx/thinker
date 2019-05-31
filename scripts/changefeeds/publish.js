const fs = require("fs");
const { getConn } = require("./queue_manager");

module.exports = {
    publish: async function publish(queue, msg) {
        try {
            const conn = await getConn();
            conn.publish("changes", queue, Buffer.from(JSON.stringify(msg)), {
                contentType: "application/json"
            });
        } catch (e) {
            console.log("Change not publish, logging...");
            fs.appendFile("./error.log", JSON.stringify(msg) + "\n", (err) => {
                if (err) console.log(err);
                console.error(e)
            });
        }
    }
};
