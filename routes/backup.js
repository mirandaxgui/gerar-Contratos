import express from 'express';
import fs from 'fs';
import path, { dirname } from 'path';
import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import { enviarParaClicksign } from '../utils/clicksign.js';
import { criarPresignedUrl, atualizarCampoCardPipefy, enviarArquivoParaPipefy } from '../utils/pipefyUpload.js';
import sharp from 'sharp';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const headerPath = path.resolve(__dirname, '../assets', 'header.png');
const footerPath = path.resolve(__dirname, '../assets', 'footer.png');
const imageMime = 'image/png';

const imageBase64 = fs.readFileSync(headerPath).toString('base64');
const imageFooterBase64 = fs.readFileSync(footerPath).toString('base64');

/** Util: data de hoje em pt-BR por extenso */
function dataHojePtBrExtenso() {
  const tz = 'America/Sao_Paulo';
  return new Intl.DateTimeFormat('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: tz
  }).format(new Date());
}

/** Util: data de hoje em formato curto */
function dataHojePtBrCurta() {
  const tz = 'America/Sao_Paulo';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: tz
  }).format(new Date());
}

/** Cálculo de preços conforme quantidade de vidas */
function obterPrecosPorVidas(qtdVidas) {
  if (qtdVidas <= 5) return { basico: 120, essencial: 170, premium: 190 };
  if (qtdVidas <= 10) return { basico: 160, essencial: 200, premium: 250 };
  if (qtdVidas <= 20) return { basico: 190, essencial: 290, premium: 360 };
  if (qtdVidas <= 30) return { basico: 240, essencial: 390, premium: 525 };
  if (qtdVidas <= 40) return { basico: 290, essencial: 450, premium: 675 };
  if (qtdVidas <= 50) return { basico: 400, essencial: 510, premium: 820 };
  return { basico: '-', essencial: '-', premium: '-' };
}

/** Normaliza examesTipos (mantido para compatibilidade com contratoCredenciada) */
function normalizeExamesTipos(exames) {
  let examesTipos = [];
  if (!exames) return examesTipos;

  const bruto = exames.examesTipos;
  if (!bruto) return examesTipos;

  if (typeof bruto === 'string') {
    examesTipos = bruto.split(',').map(tipo => tipo.trim());
  } else if (Array.isArray(bruto)) {
    examesTipos = bruto;
  } else {
    console.warn('⚠️ examesTipos veio em tipo inesperado:', typeof bruto);
  }

  return examesTipos;
}

/** Monta a tabela HTML dos exames */
function gerarTabelaExames(dados) {
  const linhas = [];
  const exames = dados.exames || {};
  const examesTipos = normalizeExamesTipos(exames);

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

  Object.keys(exames).forEach((key) => {
    if (key.startsWith('exameAdc') && !key.includes('Valor')) {
      const sufixo = key.replace('exameAdc', '');
      const nome = (exames[key] ?? '').toString().trim();
      const valor = (exames[`exameAdc${sufixo}Valor`] ?? '').toString().trim();
      if (nome && valor) {
        linhas.push(`<tr><td>${nome}</td><td>${valor}</td></tr>`);
      }
    }
  });

  return linhas.join('\n');
}

/** Substitui placeholders {{chave}} no HTML */
function preencherTemplate(html, variaveis) {
  const htmlComTabela = html.replace('{{tabelaExames}}', gerarTabelaExames(variaveis));
  const placeholders = html.match(/{{(.*?)}}/g) || [];
  console.log('🔍 Placeholders encontrados no HTML:', placeholders);

  return htmlComTabela.replace(/{{(.*?)}}/g, (_, chave) => {
    const k = (chave || '').trim();
    const valor = variaveis[k]; 1
    if (valor === undefined) {
      console.warn(`⚠️ Variável não encontrada no template: {{${k}}}`);
    }
    return valor ?? '';
  });
}

/** Endpoint principal: /gerar-pdf */
router.post('/gerar-pdf', async (req, res) => {
  try {
    const dados = req.body || {};
    console.log('🟢 Body recebido:', JSON.stringify(dados, null, 2));

    const modelo = dados.modelo || 'contratoCredenciada';
    const templatePath = path.join(__dirname, `../templates/${modelo}.html`);

    if (!fs.existsSync(templatePath)) {
      throw new Error(`Modelo HTML não encontrado: ${modelo}`);
    }

    const fontPath = path.resolve(__dirname, '../fonts', 'Roboto-Regular.ttf');
    const base64Font = fs.readFileSync(fontPath).toString('base64');
    const fontDataUrl = `data:font/ttf;base64,${base64Font}`;

    let htmlBase = fs.readFileSync(templatePath, 'utf8');
    htmlBase = htmlBase.replace('{{BASE64_FONT}}', base64Font);
    htmlBase = htmlBase.replace('{{CAMINHO_FONT}}', fontDataUrl);

    const dataAtualExtenso = dataHojePtBrExtenso();
    const dataAtualCurta = dataHojePtBrCurta();

    // Se for propostaHunter, aplica a lógica de preços e injeta imagens
    let qtdColaboradores = Number(dados.campos?.qtd_colaboradores || 0);
    let precos = { basico: '', essencial: '', premium: '' };

    if (modelo === 'propostaHunter') {
      if (qtdColaboradores > 0) {
        precos = obterPrecosPorVidas(qtdColaboradores);
      }

      // 🖼️ Carrega e otimiza imagens pagina1..15 (exceto 13)
      const pastaProposta = path.resolve(__dirname, '../assets/propostaHunter');
      for (let i = 1; i <= 15; i++) {
        if (i === 13) continue;
        const imagemPath = path.join(pastaProposta, `pagina${i}.png`);
        if (fs.existsSync(imagemPath)) {
          try {
            const buffer = await sharp(imagemPath)
              .jpeg({ quality: 80 })
              .toBuffer();

            const base64 = buffer.toString('base64');
            dados.campos[`pagina${i}`] = `data:image/jpeg;base64,${base64}`;
          } catch (err) {
            console.warn(`⚠️ Erro ao processar ${imagemPath}:`, err.message);
          }
        } else {
          console.warn(`⚠️ Imagem não encontrada: pagina${i}.png`);
        }
      }
    }

    const variaveisParaTemplate = {
      ...(dados.campos || {}),
      headerImage: `data:${imageMime};base64,${imageBase64}`,
      footerImage: `data:${imageMime};base64,${imageFooterBase64}`,
      dataAtualExtenso,
      dataAtual: dataAtualCurta,
      qtdColaboradores,
      precoBasico: precos.basico ? `R$ ${precos.basico},00` : '',
      precoEssencial: precos.essencial ? `R$ ${precos.essencial},00` : '',
      precoPremium: precos.premium ? `R$ ${precos.premium},00` : ''
    };

    //console.log('📄 Variáveis usadas no template:', JSON.stringify(variaveisParaTemplate, null, 2));

    const htmlFinal = preencherTemplate(htmlBase, variaveisParaTemplate);

    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setContent(htmlFinal, { waitUntil: 'domcontentloaded', timeout: 0 });

    const pdfBuffer = await page.pdf({
      width: '558mm',
      height: '314mm',
      printBackground: true,
      margin: { top: 0, bottom: 0, left: 0, right: 0 }
    });

    await browser.close();

    // ✅ Se o payload tiver idCard, envia o PDF também para o Pipefy
    if (dados.idCard) {
      try {
        const nomeArquivo = `proposta_${dados.idCard}.pdf`;
        console.log(`📄 Gerando presigned URL para ${nomeArquivo}...`);

        // 1️⃣ Cria URL presigned no Pipefy
        const { url, path } = await criarPresignedUrl(nomeArquivo);
        console.log("✅ Presigned URL criada!");
        console.log("📦 Path interno:", path);

        // 2️⃣ Faz upload do PDF
        console.log("⬆️ Enviando PDF para o S3 via presigned URL...");
        await enviarArquivoParaPipefy(url, pdfBuffer);
        console.log("✅ Upload concluído com sucesso!");

        // 3️⃣ Atualiza o campo "anexar_proposta_para_envio" com o path interno
        const fieldId = "anexar_proposta_para_envio"; // substitua se necessário
        console.log(`🧩 Atualizando campo '${fieldId}' no card ${dados.idCard}...`);

        const sucesso = await atualizarCampoCardPipefy(dados.idCard, fieldId, path);

        if (!sucesso) {
          console.warn("⚠️ Falha ao atualizar campo no Pipefy.");
        } else {
          console.log("✅ PDF anexado com sucesso ao card Pipefy:", path);
        }

      } catch (err) {
        console.error("❌ Erro ao enviar PDF para Pipefy:", err.message);
      }
    }

    // ✅ Mantém o envio ao Clicksign se solicitado
    if (dados.enviarParaClicksign === true) {
      const result = await enviarParaClicksign(dados, pdfBuffer);
      return res.json(result);
    }

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=${modelo}.pdf`,
      'Content-Length': pdfBuffer.length
    });
    res.send(pdfBuffer);

  } catch (error) {
    console.error('❌ Erro ao gerar PDF:', error);
    res.status(500).send('Erro ao gerar PDF');
  }
});

export default router;
