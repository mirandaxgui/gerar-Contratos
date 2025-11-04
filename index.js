import express from 'express';
import bodyParser from 'body-parser';
import gerarPdfRoute from './routes/gerarPdfRoute.js';
import enviarKitsRoute from './routes/enviarKitsRoute.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json({ limit: '5mb' }));

app.use('/', gerarPdfRoute);
app.use('/', enviarKitsRoute);
// Serve os arquivos estáticos da pasta 'build' do React
app.use(express.static(path.join(__dirname, 'build')));

// Rota para servir o formulário React na raiz
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});


app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
