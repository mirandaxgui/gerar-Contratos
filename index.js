// index.js atualizado com integração Clicksign
const express = require('express');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const bodyParser = require('body-parser');
const { enviarParaClicksign } = require('./clicksign');

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

    Object.keys(exames).forEach((key) => {
        if (!key.includes('Valor')) {
            const sufixo = key.replace('exame', '');
            const nome = exames[key];
            const valor = exames[`exame${sufixo}Valor`] || '0,00';
            if (nome) {
                linhas.push(`<tr><td>${nome}</td><td>${valor}</td></tr>`);
            }
        }
    });

    return linhas.join('\n');
}

function preencherTemplate(html, variaveis) {
    const htmlComTabela = html.replace('{{tabelaExames}}', gerarTabelaExames(variaveis));
    return htmlComTabela.replace(/{{(.*?)}}/g, (_, chave) => {
        const k = (chave || '').trim();
        return (variaveis[k] ?? '');
    });
}

app.post('/gerar-pdf', async (req, res) => {
    try {
        const dados = req.body || {};

        const dadosComImagem = {
            ...dados,
            headerImage: `data:${imageMime};base64,${imageBase64}`,
            footerImage: `data:${imageMime};base64,${imageFooterBase64}`
        };

        const fontPath = path.resolve(__dirname, 'fonts', 'Roboto-Regular.ttf');
        const base64Font = fs.readFileSync(fontPath).toString('base64');
        const fontDataUrl = `data:font/ttf;base64,${base64Font}`;

        let htmlBase = fs.readFileSync(path.join(__dirname, 'template.html'), 'utf8');
        htmlBase = htmlBase.replace('{{BASE64_FONT}}', base64Font);
        htmlBase = htmlBase.replace('{{CAMINHO_FONT}}', fontDataUrl);

        const htmlFinal = preencherTemplate(htmlBase, dadosComImagem);

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
        console.error('Erro ao gerar PDF:', error);
        res.status(500).send('Erro ao gerar PDF');
    }
});

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
