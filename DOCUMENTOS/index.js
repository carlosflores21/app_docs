const express = require("express");
const amqp = require("amqplib");
const mongoose = require('mongoose');
const { documentSchema } = require('./schemas');


const Document = mongoose.model('Document', documentSchema);

const app = express();
app.use(express.json());
const port = 3000;

app.get('/', (req, res) => { res.send("I am alive DOCUMENTOS"); });

const exchange = 'documents_exchange';
const queue = 'documents_queue';

async function connectRabbit() {
    const conn = await amqp.connect("amqp://guest:guest@localhost");
    const channel = await conn.createChannel();
    await channel.assertExchange(exchange, 'direct', { durable: true });
    await channel.assertQueue(queue, { durable: true });
    await channel.bindQueue(queue, exchange, 'documents_routing_key');
    return channel;
}

app.post('/sendDocs', async (req, res) => {
    try {
        const { id, name, type, content } = req.body;

        const timestamp = new Date().toISOString();

        const document = new Document({ id, name, type, content, timestamp });

        await document.validate();

        const documentObject = document.toObject();
        const channel = await connectRabbit();

        console.log("Documento a enviar:", documentObject); 

        await channel.publish(exchange, 'documents_routing_key', Buffer.from(JSON.stringify(documentObject)), {
            persistent: true,
        });

        await channel.close();
        return res.status(201).json(documentObject);
    } catch (error) {
        console.error('Error', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
});

app.get('/consulta', async (req, res) => {
    try {
        const channel = await connectRabbit();

        const documents = [];
        console.log("Iniciando consumo de mensajes...");
        const consumeMessages = new Promise((resolve, reject) => {
            channel.consume(queue, (msg) => {
                if (msg) {
                    const document = JSON.parse(msg.content.toString());
                    console.log("Mensaje recibido:", document);
                    documents.push({ id: document.id, status: 'pendiente' });
                    channel.ack(msg);
                }
            }, { noAck: false }).then((consumerTag) => {
                setTimeout(async () => {
                    await channel.cancel(consumerTag.consumerTag);
                    resolve();
                }, 1000);
            }).catch((err) => {
                console.error('Error al consumir mensajes:', err);
                reject(err);
            });
        });

        await consumeMessages;
        await channel.close();
        console.log("Documentos obtenidos:", documents);
        res.status(200).json(documents);
    } catch (error) {
        console.error('Error', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.listen(port, () => {
    console.log(`DOCUMENTOS service running on port ${port}`);
});
