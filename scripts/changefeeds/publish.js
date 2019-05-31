const fs = require("fs");
const amqp = require("amqplib");
let ch = null;

module.exports = {
    setup: async function setup(queue) {
        if (ch) return ch;

        const q = `changes.${queue}`;
        const rabbit = await amqp.connect(process.env.RABBITMQ_URL || "amqp://localhost");
        ch = await rabbit.createChannel();
        await ch.assertExchange("changes", "fanout");
        await ch.assertQueue(q);
        await ch.bindQueue(q, "changes")
    
        return ch;
    },
    publish: async function publish(queue, msg) {
        try {
            ch.publish("changes", queue, Buffer.from(JSON.stringify(msg)), {
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
