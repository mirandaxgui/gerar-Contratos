import express from 'express';
import bodyParser from 'body-parser';
import gerarPdfRoute from './routes/gerarPdfRoute.js';
import enviarKitsRoute from './routes/enviarKitsRoute.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json({ limit: '5mb' }));

app.use('/', gerarPdfRoute);
app.use('/', enviarKitsRoute);

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
