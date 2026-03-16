import express from 'express';
import fs from 'fs';
import path, { dirname } from 'path';
import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import { enviarParaClicksign } from '../utils/clicksign.js';
import { criarPresignedUrl, atualizarCampoCardPipefy, enviarArquivoParaPipefy } from '../utils/pipefyUpload.js';
import { dataHojePtBrExtenso, dataHojePtBrCurta, preencherTemplate, obterPrecosPorVidas } from '../utils/util.js';
import sharp from 'sharp';

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const headerPath = path.resolve(__dirname, '../assets', 'header.png');
const footerPath = path.resolve(__dirname, '../assets', 'footer.png');
const greenMark = path.resolve(__dirname, '../assets', 'greenMark.png');
const redMark = path.resolve(__dirname, '../assets', 'redMark.png');
const logoDemaisPath = path.resolve(__dirname, '../assets', 'd+white-dark-bg.png');
const imageMime = 'image/png';

const imageBase64 = fs.readFileSync(headerPath).toString('base64');
const imageFooterBase64 = fs.readFileSync(footerPath).toString('base64');
const logoDemaisBase64 = fs.readFileSync(logoDemaisPath).toString('base64');

const greenMarkBase64 = fs.readFileSync(greenMark).toString('base64');
const redMarkBase64 = fs.readFileSync(redMark).toString('base64');


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
    let tabelaProdutos = "";
    let totalGeral = "";
    let valorDesconto = "";
    let valorFinal = "";
    let metadeValorTotal = "";
    let mesRealizacao = "";
    let idCard = "";
    let paragrafoPagamento = "";
    // Se for propostaHunter, aplica a lógica de preços e injeta imagens
    let qtdColaboradores = Number(dados.campos?.qtd_colaboradores || 0);
    let precos = { basico: '', essencial: '', premium: '' };

    if (modelo === 'propostaHunter') {
      if (qtdColaboradores > 0) {
        precos = obterPrecosPorVidas(qtdColaboradores);
      }
      idCard = dados.idCard || "";

      // 🖼️ PROPOSTA HUNTER - Carrega e otimiza imagens pagina1..15 (exceto 13)
      const pastaPropostaHunter = path.resolve(__dirname, '../assets/propostaHunter');

      for (let i = 1; i <= 15; i++) {
        if (i === 13) continue;
        const imagemPath = path.join(pastaPropostaHunter, `pagina${i}.png`);
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

    if (modelo === 'propostaFarmer') {

      const produtos = dados.campos?.produtos || [];

      totalGeral = dados.campos?.totalGeral;
      valorDesconto = dados.campos?.valorDesconto;
      valorFinal = dados.campos?.valorFinal;
      mesRealizacao = `${dados.campos?.mesRealizacao}/${new Date().getFullYear()}`;
      idCard = dados.idCard || "";
      // Filtra itens onde qtd não é 0 e existe
      const produtosValidos = produtos.filter(p => Number(p.qtd) > 0);

      tabelaProdutos = produtosValidos.map(p => {
        const custoTotal = Number(p.qtd) * Number(p.unit);
        return `
        <tr>
            <td style="border:1px solid #193b33; padding:10px 12px;">
                ${p.item}
            </td>

            <td style="border:1px solid #193b33; text-align:center; color:#00e08a;">
                ${p.qtd}
            </td>

            <td style="border:1px solid #193b33; text-align:center; color:#00e08a;">
                R$ ${Number(p.unit).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </td>

            <td style="border:1px solid #193b33; text-align:center; color:#00e08a;">
                R$ ${custoTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </td>
        </tr>
      `;
      }).join('\n');


      // --------------------------------------------
      // 🔹 LINHA DESCONTO (CONDICIONAL)
      // --------------------------------------------
      const linhaDesconto =
        valorDesconto
          ? `
      <tr>
        <td colspan="3"
            style="border:1px solid #193b33; padding:10px 12px; text-align:center; font-weight:bold;">
            Desconto para pagamento à vista
        </td>
        <td style="border:1px solid #193b33; text-align:center; font-weight:bold; color:#00e08a;">
            ${valorDesconto}
        </td>
      </tr>`
          : "";

      // --------------------------------------------
      // 🔹 LINHA PAGAMENTO (SEMPRE APARECE)
      // --------------------------------------------
      const linhaPagamento = `
    <tr>
      <td colspan="3"
          style="border:1px solid #193b33; padding:10px 12px; text-align:center; font-weight:bold;">
          Forma de Pagamento
      </td>
      <td style="border:1px solid #193b33; text-align:center; font-weight:bold; color:#00e08a;">
          ${dados.campos.formaPagamento || ""}
      </td>
    </tr>
    <tr>
      <td colspan="3"
          style="border:1px solid #193b33; padding:10px 12px; text-align:center; font-weight:bold;">
          Quantidade de Parcelas
      </td>
      <td style="border:1px solid #193b33; text-align:center; font-weight:bold; color:#00e08a;">
          ${dados.campos.parcelas ? ` ${dados.campos.parcelas}x` : ""}
      </td>
    </tr>
     <tr>
      <td colspan="3"
          style="border:1px solid #193b33; padding:10px 12px; text-align:center; font-weight:bold;">
          Data do Primeiro Pagamento
      </td>
      <td style="border:1px solid #193b33; text-align:center; font-weight:bold; color:#00e08a;">
          ${dados.campos.dataPrimeiroPagamento
          ? dados.campos.dataPrimeiroPagamento.split('-').reverse().join('/')
          : ""
        }

      </td>
    </tr>
  `;

      // 🔹 adiciona no objeto para o template
      dados.campos.linhaDesconto = linhaDesconto;
      dados.campos.linhaPagamento = linhaPagamento;


      // Formatar valores finais
      totalGeral = Number(totalGeral).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
      valorFinal = Number(valorFinal).toLocaleString('pt-BR', { minimumFractionDigits: 2 });

      // CARREGAR IMAGENS
      const pastaPropostaFarmer = path.resolve(__dirname, '../assets/propostaFarmer');
      for (let i = 1; i <= 14; i++) {
        if (i === 12) continue;
        const imagemPath = path.join(pastaPropostaFarmer, `pagina${i}.png`);
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

    //LISTA DIRECIONADA AO TEMPLATE DE PROPOSTA DO PERIÓDICO
    const itens = (dados.campos?.complementaresAdc || '')
      .split(',')
      .map(item => item.trim())
      .filter(item => /^\d+/.test(item));

    const colunas = [[], [], []];

    itens.forEach((item, index) => {
      colunas[index % 3].push(item);
    });

    const listaComplementares = `
      <div style="display: flex; gap: 30px;">
        ${colunas.map(coluna => `
          <ul style="list-style: disc; font-size: 13px;"> 
            ${coluna.map(item => `<li>${item};</li>`).join('')}
          </ul>
        `).join('')}
      </div>
    `;


    if (modelo === 'propostaPeriodico') {
      //PROPOSTA PERIÓDICO
      // CÁLCULO DO 50% (PROPOSTA PERIÓDICO)
      let valorRaw = dados.campos?.valorTotal || "0";
      let formaPagamento = dados.campos?.formaPagamento || "";
      let dataPrimeiroPagamento = dados.campos?.dataPrimeiroPagamento
        ? dados.campos.dataPrimeiroPagamento.split('-').reverse().join('/')
        : "";
      let qtdParcelas = dados.campos?.qtdParcelas || ""; 

      // Corrige formato vindo com vírgula
      if (valorRaw.includes(",")) {
        valorRaw = valorRaw.replace(/\./g, "").replace(",", ".");
      }

      // Converte para número
      let valorNumero = Number(valorRaw);

      // Formata sempre com duas casas
      let valorTotal = valorNumero.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });

      let metadeValorTotal = (valorNumero / 2).toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });

      // Verifica se é pagamento à vista
      if (
        formaPagamento === "Boleto à vista" ||
        formaPagamento === "Cartão de crédito à vista" ||
        formaPagamento === "Pix à vista"
      ) {

        paragrafoPagamento = `
        <p>
            O valor final do atendimento in loco será de <strong>R$ ${valorTotal}</strong>.
            Sendo assim, fica acordado que:
            <br><br>
            • O <strong>valor total</strong> será pago de maneira integral na modalidade
            <strong>${formaPagamento}</strong>.
            <br><br>
            O pagamento deverá ser efetuado pela CONTRATANTE conforme condições
            previamente estabelecidas.
        </p>`;

      } else {

        paragrafoPagamento = `
        <p>
            O valor final do atendimento in loco será de <strong>R$ ${valorTotal}</strong>.
            Sendo assim, fica acordado que:
            <br><br>
            • <strong>50% do valor total</strong>, equivalente a
            <strong>R$ ${metadeValorTotal}</strong>, deverá ser pago em
            <strong>${dataPrimeiroPagamento}</strong>;
            <br>
            • Os <strong>50% restantes</strong>, equivalentes a
            <strong>R$ ${metadeValorTotal}</strong>, serão parcelados em
            <strong>${qtdParcelas}x</strong> na modalidade
            <strong>${formaPagamento}</strong>.
            <br><br>
            O pagamento deverá ser efetuado pela CONTRATANTE conforme condições
            previamente estabelecidas.
        </p>`;

      }

    }

    const variaveisParaTemplate = {
      ...(dados.campos || {}),
      headerImage: `data:${imageMime};base64,${imageBase64}`,
      footerImage: `data:${imageMime};base64,${imageFooterBase64}`,
      logoDemais: `data:${imageMime};base64,${logoDemaisBase64}`,
      dataAtualExtenso,
      dataAtual: dataAtualCurta,
      //PROPOSTA HUNTER
      greenMark: `data:${imageMime};base64,${greenMarkBase64}`,
      redMark: `data:${imageMime};base64,${redMarkBase64}`,
      qtdColaboradores,
      precoBasico: precos.basico ? `R$ ${precos.basico},00` : '',
      precoEssencial: precos.essencial ? `R$ ${precos.essencial},00` : '',
      precoPremium: precos.premium ? `R$ ${precos.premium},00` : '',
      //LISTA DIRECIONADA AO TEMPLATE DE PROPOSTA DO PERIÓDICO
      complementaresAdcFormatado: listaComplementares,
      //PROPOSTA FARMER
      tabelaProdutos,
      totalGeral,
      valorDesconto,
      valorFinal,
      paragrafoPagamento,
      mesRealizacao,
      idCard,

      //PROPOSTA PERIÓDICO
      metadeValorTotal,
      dataPrimeiroPagamento: dados.campos?.dataPrimeiroPagamento || "",



    };

    //console.log('📄 Variáveis usadas no template:', JSON.stringify(variaveisParaTemplate, null, 2));

    const htmlFinal = preencherTemplate(htmlBase, variaveisParaTemplate);

    const browser = await puppeteer.launch({
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setContent(htmlFinal, { waitUntil: 'domcontentloaded', timeout: 0 });
    let pdfBuffer;
    if (dados.modelo === 'propostaHunter') {
      pdfBuffer = await page.pdf({
        width: '558mm',
        height: '314mm',
        printBackground: true,
        margin: { top: 0, bottom: 0, left: 0, right: 0 },
        timeout: 120000
      });
      await browser.close();
    }

    if (dados.modelo === 'propostaFarmer') {

      pdfBuffer = await page.pdf({
        width: '558mm',
        height: '314mm',
        printBackground: true,
        margin: { top: 0, bottom: 0, left: 0, right: 0 }
      });
      await browser.close();
    }

    if (dados.modelo === 'contratoCredenciada') {
      await page.setContent(htmlFinal, { waitUntil: 'networkidle0' });

      pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true
      });
      await browser.close();
    };
    if (dados.modelo === 'propostaPeriodico') {
      await page.setContent(htmlFinal, { waitUntil: 'domcontentloaded', timeout: 0 });
      await page.emulateMediaType('print'); // ✅ o correto para respeitar page-breaks



      pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: 0, bottom: 0, left: 0, right: 0 }
      });
      await browser.close();
    };



    console.log(dados.enviarParaClicksign)

    // ✅ Se o payload tiver idCard, envia o PDF também para o Pipefy
    if (dados.idCard && !dados.enviarParaClicksign) {
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
    console.log(dados.enviarParaClicksign)
    // ✅ Mantém o envio ao Clicksign se solicitado
    if (dados.enviarParaClicksign === true) {
      const result = await enviarParaClicksign(dados, pdfBuffer);
      return res.json(result);
    }

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=${modelo}.pdf`,
      //'Content-Length': pdfBuffer.length
    });

    if (dados.retornaPdf === true) {
      return res.send(pdfBuffer);
    }
    return res.status(200).json({
      sucesso: true,
      mensagem: "PDF gerado com sucesso",
      modelo,
      idCard: dados.idCard || null
    });


  } catch (error) {
    console.error('❌ Erro ao gerar PDF:', error);
    res.status(500).send('Erro ao gerar PDF');
  }
});

export default router;
