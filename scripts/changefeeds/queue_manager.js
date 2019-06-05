const amqp = require("amqplib");
let ch = null;

async function getConn() {
    if (ch) return ch;
    
    const rabbit = await amqp.connect(process.env.RABBITMQ_URL || "amqp://localhost");
    ch = await rabbit.createChannel();
    
    // DELETE ME AFTER USING
    const q1DLQ = `changes.files_changes.dead`;
    await ch.assertExchange("changes.dead", "fanout");
    await ch.assertQueue(q1DLQ);
    await ch.bindQueue(q1DLQ, "changes.dead");

    return ch;
}

module.exports = {
    setup: async function setup(queue) {
        const q1 = `changes.${queue}`;
        const q2 = `changes.${queue}.copy`;
        
        const conn = await getConn();

        await conn.assertExchange("changes", "fanout");
        await conn.assertQueue(q1);
        await conn.bindQueue(q1, "changes");

        await conn.assertQueue(q2);
        await conn.bindQueue(q2, "changes");

        // SETUP DEAD QUEUES
        const q1DLQ = `changes.${queue}.dead`;
        await conn.assertExchange("changes.dead", "fanout");
        await conn.assertQueue(q1DLQ);
        await conn.bindQueue(q1DLQ, "changes.dead");

        // curl -XPUT -H 'Content-Type: application/json' -d'{"pattern":"^changes.*","apply-to":"queues","definition":{"dead-letter-exchange":"changes.dead"},"priority":10}' http://guest:guest@127.0.0.1:15672/api/policies/%2f/Changes%20DLX
    },
    getConn
}
