// index.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;

// Imagens do cabeçalho e rodapé (convertidas para base64)
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

// Gera as linhas da tabela de exames adicionais
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

        // Caminho absoluto da fonte Roboto no formato file:///
        const fontPath = path.resolve(__dirname, 'fonts', 'Roboto-Regular.ttf');
        const fontUrl = `file:///${fontPath.replace(/\\/g, '/')}`; // Corrige para Windows

        // Lê o HTML base
        let htmlBase = fs.readFileSync(path.join(__dirname, 'template.html'), 'utf8');

        // Injeta o caminho da fonte
        htmlBase = htmlBase.replace('{{CAMINHO_FONT}}', fontUrl);

        // Substitui os placeholders pelas variáveis
        const htmlFinal = preencherTemplate(htmlBase, dadosComImagem);

        // Inicia o Puppeteer
        const browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();

        // Carrega o HTML gerado
        await page.setContent(htmlFinal, { waitUntil: 'networkidle0' });

        // Gera o PDF
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
