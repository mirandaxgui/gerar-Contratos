// index.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Imagens do cabeçalho e rodapé (convertidas para base64)
const headerPath = path.resolve(__dirname, 'assets', 'header.png');
const footerPath = path.resolve(__dirname, 'assets', 'footer.png');

const imageMime = 'image/png';
const imageBuffer = fs.readFileSync(headerPath);
const imageBase64 = imageBuffer.toString('base64');

const imageFooterBuffer = fs.readFileSync(footerPath);
const imageFooterBase64 = imageFooterBuffer.toString('base64');

app.use(bodyParser.json({ limit: '5mb' })); // ou sem nenhuma opção, se preferir


// Função para substituir {{variavel}} no HTML
function preencherTemplate(html, variaveis) {
    const htmlComExames = html.replace("{{examesAdicionais}}", gerarLinhasExamesAdicionais(variaveis));
    return htmlComExames.replace(/{{(.*?)}}/g, (_, chave) => {
        const k = (chave || '').trim();
        return (variaveis[k] ?? '');
    });
}

// Gera as linhas da tabela de exames adicionais
function gerarLinhasExamesAdicionais(dados) {
    const linhas = [];
    Object.keys(dados).forEach((key) => {
        if (key.startsWith('exameAdc') && !key.includes('Valor')) {
            const numero = key.replace('exameAdc', '');
            const nome = dados[key];
            const valor = dados[`exameAdc${numero}Valor`] || '0,00';
            if (nome) linhas.push(`<tr><td>${nome}</td><td>${valor}</td></tr>`);
        }
    });
    return linhas.join('\n');
}

app.post('/gerar-pdf', async (req, res) => {
    try {
        const dados = req.body || {};

        // ✅ LOG 1: Verifica se já chega corrompido no body
        console.log('\n[LOG 1] nomeCredenciada recebido no req.body:');
        console.log(req.body.nomeCredenciada);

        // Injeta as imagens como data URL
        const dadosComImagem = {
            ...dados,
            headerImage: `data:${imageMime};base64,${imageBase64}`,
            footerImage: `data:${imageMime};base64,${imageFooterBase64}`
        };

        // Lê e embute a fonte Roboto em Base64 (solução definitiva p/ acentos)
        const fontPath = path.resolve(__dirname, 'fonts', 'Roboto-Regular.ttf');
        const fontBuffer = fs.readFileSync(fontPath);
        const base64Font = fontBuffer.toString('base64');
        const fontDataUrl = `data:font/ttf;base64,${base64Font}`;

        // Lê o HTML base
        let htmlBase = fs.readFileSync(path.join(__dirname, 'template.html'), 'utf8');

        // ✅ LOG 2: Verifica se o template está lido corretamente (com acentos)
        console.log('\n[LOG 2] Primeiros 500 caracteres do template.html:');
        console.log(htmlBase.slice(0, 500));

        // Preferido: placeholder BASE64_FONT
        htmlBase = htmlBase.replace('{{BASE64_FONT}}', base64Font);
        htmlBase = htmlBase.replace('{{CAMINHO_FONT}}', fontDataUrl);

        // Substitui os placeholders pelas variáveis do contrato
        const htmlFinal = preencherTemplate(htmlBase, dadosComImagem);

        // ✅ LOG 3: Conteúdo final que o Puppeteer vai renderizar
        console.log('\n[LOG 3] HTML final enviado ao Puppeteer (primeiros 500 caracteres):');
        console.log(htmlFinal.slice(0, 500));

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
    console.log(`Servidor rodando em ${PORT}`);
});
