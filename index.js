// index.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;

const headerPath = path.resolve(__dirname, 'assets', 'header.png');
const imageBuffer = fs.readFileSync(headerPath);
const imageBase64 = imageBuffer.toString('base64');
const imageMime = 'image/png';

const footerPath = path.resolve(__dirname, 'assets', 'footer.png');
const imageFooterBuffer = fs.readFileSync(footerPath);
const imageFooterBase64 = imageFooterBuffer.toString('base64');
const imageFooterMime = 'image/png';

app.use(bodyParser.json());

// Função para substituir {{variavel}} no HTML
function preencherTemplate(html, variaveis) {
    const htmlComExames = html.replace("{{examesAdicionais}}", gerarLinhasExamesAdicionais(variaveis));
    return htmlComExames.replace(/{{(.*?)}}/g, (_, chave) => variaveis[chave.trim()] || '');

}

function gerarLinhasExamesAdicionais(dados) {
    const linhas = [];

    Object.keys(dados).forEach((key) => {
        if (key.startsWith("exameAdc") && !key.includes("Valor")) {
            const numero = key.replace("exameAdc", "");
            const nome = dados[key];
            const valor = dados[`exameAdc${numero}Valor`] || "0,00";

            linhas.push(`<tr><td>${nome}</td><td>${valor}</td></tr>`);
        }
    });

    return linhas.join("\n");
}

app.post('/gerar-pdf', async (req, res) => {
    try {
        const dados = req.body;
        const dadosComImagem = {
            ...dados,
            headerImage: `data:${imageMime};base64,${imageBase64}`,
            footerImage: `data:${imageFooterMime};base64,${imageFooterBase64}`
        };
        // Lê o HTML base
        const htmlBase = fs.readFileSync(path.join(__dirname, 'template.html'), 'utf8');

        // Substitui os placeholders pelas variáveis
        const htmlFinal = preencherTemplate(htmlBase, dadosComImagem);

        // Inicia o Puppeteer (modo headless)
        const browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();

        // Carrega o HTML como string
        await page.setContent(htmlFinal, { waitUntil: 'networkidle0' });

        // Gera PDF
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true
        });

        await browser.close();

        // Retorna o PDF para download
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
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});
