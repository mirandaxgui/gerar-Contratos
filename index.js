// index.js atualizado com integração Clicksign e logs de depuração

import express from 'express';
import fs from 'fs';
import path, { dirname } from 'path';
import puppeteer from 'puppeteer';
import bodyParser from 'body-parser';
import { fileURLToPath } from 'url';
import { enviarParaClicksign } from './clicksign.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

const headerPath = path.resolve(__dirname, 'assets', 'header.png');
const footerPath = path.resolve(__dirname, 'assets', 'footer.png');
const imageMime = 'image/png';

const imageBase64 = fs.readFileSync(headerPath).toString('base64');
const imageFooterBase64 = fs.readFileSync(footerPath).toString('base64');

app.use(bodyParser.json({ limit: '5mb' }));

function gerarTabelaExames(dados) {
  const linhas = [];
  const exames = dados.exames || {};

  // 🔄 Normaliza examesTipos
  let examesTipos = [];
  if (exames.examesTipos) {
    if (Array.isArray(exames.examesTipos)) {
      examesTipos = exames.examesTipos;
    } else if (typeof exames.examesTipos === 'string') {
      try {
        examesTipos = JSON.parse(exames.examesTipos);
      } catch (e) {
        console.warn('⚠️ examesTipos veio em formato inválido:', exames.examesTipos);
      }
    }
  }

  // 🩺 1. Exames principais
  Object.keys(exames).forEach((key) => {
    if (key.startsWith('exame') && !key.includes('Valor') && !key.includes('Adc')) {
      const sufixo = key.replace('exame', '');
      const nome = exames[key];
      const valor = exames[`exame${sufixo}Valor`] || '0,00';

      if (nome && examesTipos.includes(nome)) {
        linhas.push(`<tr><td>${nome}</td><td>${valor}</td></tr>`);
      }
    }
  });

  // ➕ 2. Exames adicionais (só se nome e valor não forem vazios)
  Object.keys(exames).forEach((key) => {
    if (key.startsWith('exameAdc') && !key.includes('Valor')) {
      const sufixo = key.replace('exameAdc', '');
      const nome = exames[key]?.trim();
      const valor = exames[`exameAdc${sufixo}Valor`]?.trim();

      if (nome && valor) {
        linhas.push(`<tr><td>${nome}</td><td>${valor}</td></tr>`);
      }
    }
  });

  return linhas.join('\n');
}




function preencherTemplate(html, variaveis) {
  const htmlComTabela = html.replace('{{tabelaExames}}', gerarTabelaExames(variaveis));

  const placeholders = html.match(/{{(.*?)}}/g) || [];
  console.log('🔍 Placeholders encontrados no HTML:', placeholders);

  return htmlComTabela.replace(/{{(.*?)}}/g, (_, chave) => {
    const k = (chave || '').trim();
    const valor = variaveis[k];
    if (valor === undefined) {
      console.warn(`⚠️ Variável não encontrada: {{${k}}}`);
    }
    return valor ?? '';
  });
}

app.post('/gerar-pdf', async (req, res) => {
  try {
    const dados = req.body || {};
    console.log('🟢 Body recebido:', JSON.stringify(dados, null, 2));

    const fontPath = path.resolve(__dirname, 'fonts', 'Roboto-Regular.ttf');
    const base64Font = fs.readFileSync(fontPath).toString('base64');
    const fontDataUrl = `data:font/ttf;base64,${base64Font}`;

    let htmlBase = fs.readFileSync(path.join(__dirname, 'template.html'), 'utf8');
    htmlBase = htmlBase.replace('{{BASE64_FONT}}', base64Font);
    htmlBase = htmlBase.replace('{{CAMINHO_FONT}}', fontDataUrl);

    const variaveisParaTemplate = {
      ...dados.campos,
      headerImage: `data:${imageMime};base64,${imageBase64}`,
      footerImage: `data:${imageMime};base64,${imageFooterBase64}`
    };

    console.log('📄 Variáveis usadas no template:', JSON.stringify(variaveisParaTemplate, null, 2));

    const htmlFinal = preencherTemplate(htmlBase, variaveisParaTemplate);

    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setContent(htmlFinal, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true
    });

    await browser.close();

    if (dados.enviarParaClicksign === true) {
      const result = await enviarParaClicksign(dados, pdfBuffer);
      return res.json(result);
    }

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename=contrato.pdf',
      'Content-Length': pdfBuffer.length
    });
    res.send(pdfBuffer);

  } catch (error) {
    console.error('❌ Erro ao gerar PDF:', error);
    res.status(500).send('Erro ao gerar PDF');
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
