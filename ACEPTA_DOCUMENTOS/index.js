const express = require("express");
const amqp = require("amqplib");

const app = express();
app.use(express.json());
const port = 4000;

app.get('/', (req, res) => { res.send("I am alive DOCUMENTOS_ACEPTADOS"); });

const queue = 'documents_queue';
let documentStatus = {};

// Función para generar un retraso aleatorio entre 0 y 60 segundos
function getRandomDelay() {
    return Math.floor(Math.random() * 60000);
}

async function startConsumer() {
  const conn = await amqp.connect("amqp://guest:guest@localhost:15672");
    const channel = await conn.createChannel();
    await channel.assertQueue(queue, { durable: true });

    channel.consume(queue, (msg) => {
        if (msg !== null) {
            const document = JSON.parse(msg.content.toString());
            const documentId = document.id;
            documentStatus[documentId] = 'en proceso'; // Estado inicial

            setTimeout(() => {
                try {
                    documentStatus[documentId] = 'aceptado';
                    channel.ack(msg);
                    console.log(`Documento ${documentId} procesado y aceptado`);
                } catch (error) {
                    documentStatus[documentId] = 'rechazado';
                    console.error('Error al procesar el documento', error);
                    channel.nack(msg, false, true);
                }
            }, getRandomDelay());
        }
    }, { noAck: false });
}

app.get('/consulta', (req, res) => {
    const documentId = req.query.documentId;
    const status = documentStatus[documentId] || 'desconocido';
    res.status(200).json({ estado: status });
});

app.listen(port, () => {
    console.log(`ACEPTA_DOCUMENTOS service running on port ${port}`);
    startConsumer();
});
