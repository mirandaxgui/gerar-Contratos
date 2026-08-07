import express from 'express';
import bodyParser from 'body-parser';
import gerarPdfRoute from './routes/gerarPdfRoute.js';
import enviarKitsRoute from './routes/enviarKitsRoute.js';
import subirAsoRouter from './routes/subirAsoRouter.js';
import { setPipefyToken } from './utils/pipefyToken.js';
import path from 'path';
import { fileURLToPath } from 'url';
import formSolicRoute from './routes/formSolicRoute.js'; // Importando a rota

// Obtém o diretório atual
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

async function gerarPipefyToken() {
  const clientId = process.env.PIPEFY_CLIENT_ID; // Certifique-se de definir isso no seu .env
  const clientSecret = process.env.PIPEFY_CLIENT_SECRET; // Certifique-se de definir isso no seu .env

  if (!clientId || !clientSecret) {
    throw new Error(
      'PIPEFY_CLIENT_ID ou PIPEFY_CLIENT_SECRET não configurados.'
    );
  }

  const response = await fetch(
    'https://app.pipefy.com/oauth/token',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
      }),
    }
  );

  if (!response.ok) {
    const erro = await response.text();

    throw new Error(
      `Erro OAuth Pipefy: HTTP ${response.status} - ${erro}`
    );
  }

  const data = await response.json();

  if (!data.access_token) {
    throw new Error('Pipefy não retornou access_token.');
  }

  return data;
}


async function atualizarPipefyToken() {
  const tokenData = await gerarPipefyToken();

  setPipefyToken(tokenData.access_token);


  return tokenData;
}

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

await atualizarPipefyToken();

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
