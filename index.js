import express from 'express';
import bodyParser from 'body-parser';
import gerarPdfRoute from './routes/gerarPdfRoute.js';
import enviarKitsRoute from './routes/enviarKitsRoute.js';
import subirAsoRouter from './routes/subirAsoRouter.js';
import path from 'path';
import { fileURLToPath } from 'url';
import formSolicRoute from './routes/formSolicRoute.js'; // Importando a rota

// Obtém o diretório atual
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json({ limit: '5mb' }));

app.use('/', gerarPdfRoute);
app.use('/', enviarKitsRoute);
app.use('/', subirAsoRouter);

// Serve os arquivos estáticos da pasta 'build' do React
app.use(express.static(path.join(__dirname, 'build')));

// Rota para servir o formulário React na raiz
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Rota para servir o formulário React na raiz
app.get('/colaboradores', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.use('/api/v3/', formSolicRoute); // Usando a rota para formSolicitações

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
