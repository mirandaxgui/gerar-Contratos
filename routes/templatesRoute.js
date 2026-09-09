import express from 'express';
import puppeteer from 'puppeteer';
import {
  getAllTemplates,
  getTemplateById,
  saveTemplate,
  deleteTemplate,
  fillTemplate,
  extractVariables,
  convertDocxToHtml,
  compileFullDocumentHtml
} from '../utils/templateManager.js';
import { preencherTemplate } from '../utils/util.js';
import { enviarParaClicksign } from '../utils/clicksign.js';

const router = express.Router();

/** GET /api/templates - List all templates */
router.get('/', async (req, res) => {
  try {
    console.log('📋 [API /templates] Listando todos os templates...');
    const templates = await getAllTemplates();
    res.status(200).json({
      sucesso: true,
      total: templates.length,
      dados: templates
    });
  } catch (error) {
    console.error('❌ [API /templates] Erro ao listar templates:', error);
    res.status(500).json({ sucesso: false, erro: error.message });
  }
});

/** GET /api/templates/:id - Get template details */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🔍 [API /templates/${id}] Buscando detalhes do template...`);
    const template = await getTemplateById(id);

    if (!template) {
      console.warn(`⚠️ [API /templates/${id}] Template não encontrado.`);
      return res.status(404).json({ sucesso: false, erro: 'Template não encontrado.' });
    }

    console.log(`✅ [API /templates/${id}] Template encontrado! bgUrl presente: ${template.bgUrl ? 'SIM' : 'NÃO'}`);
    res.status(200).json({
      sucesso: true,
      dados: template
    });
  } catch (error) {
    console.error(`❌ [API /templates/${req.params.id}] Erro:`, error);
    res.status(500).json({ sucesso: false, erro: error.message });
  }
});

/** POST /api/templates/import - Import template file (.docx, .html, .txt) */
router.post('/import', async (req, res) => {
  try {
    const { fileName = '', fileType = '', contentBase64 = '', fileText = '' } = req.body || {};
    console.log(`📥 [API /templates/import] Recebendo arquivo "${fileName}" (tipo: ${fileType})`);

    let htmlContent = '';
    let headerHtml = '';
    let footerHtml = '';
    const isDocx = fileType.includes('word') || fileType.includes('docx') || fileName.toLowerCase().endsWith('.docx');

    if (isDocx && contentBase64) {
      console.log('📄 [API /templates/import] Convertendo buffer DOCX via Mammoth...');
      const buffer = Buffer.from(contentBase64, 'base64');
      const conversion = await convertDocxToHtml(buffer);
      htmlContent = conversion.html;
      headerHtml = conversion.headerHtml || '';
      footerHtml = conversion.footerHtml || '';
      console.log('✅ [API /templates/import] DOCX convertido com sucesso!');
    } else if (fileText) {
      htmlContent = fileText;
    } else if (contentBase64) {
      htmlContent = Buffer.from(contentBase64, 'base64').toString('utf8');
    } else {
      return res.status(400).json({ sucesso: false, erro: 'Conteúdo do arquivo não fornecido.' });
    }

    const variables = extractVariables(htmlContent + ' ' + headerHtml + ' ' + footerHtml);
    const suggestedName = fileName ? fileName.replace(/\.[^/.]+$/, '') : 'Template Importado';

    console.log(`✅ [API /templates/import] Retornando HTML importado (${htmlContent.length} caracteres, ${variables.length} variáveis)`);

    res.status(200).json({
      sucesso: true,
      mensagem: 'Arquivo importado com sucesso!',
      dados: {
        name: suggestedName,
        html: htmlContent,
        headerHtml,
        footerHtml,
        variables
      }
    });

  } catch (error) {
    console.error('❌ [API /templates/import] Erro ao importar arquivo:', error);
    res.status(500).json({ sucesso: false, erro: error.message });
  }
});

/** POST /api/templates - Create new template */
router.post('/', async (req, res) => {
  try {
    const { id, name, description, html, headerHtml, footerHtml, headerImageUrl, headerImageWidth, headerImageHeight, headerImageAlign, headerImageFit, footerImageUrl, footerImageWidth, footerImageHeight, footerImageAlign, footerImageFit, showPageNumbers, orientation, margins, pageSize, lineSpacing, bgUrl, bgSize, bgOpacity, bgPaddingTop, bgMarginTop, bgMarginLeft, bgMarginRight, bgMarginSide } = req.body || {};
    console.log(`💾 [API POST /templates] Criando template "${name}"... bgUrl enviado: ${bgUrl ? 'SIM' : 'NÃO'}`);
    
    const result = await saveTemplate({ id, name, description, html, headerHtml, footerHtml, headerImageUrl, headerImageWidth, headerImageHeight, headerImageAlign, headerImageFit, footerImageUrl, footerImageWidth, footerImageHeight, footerImageAlign, footerImageFit, showPageNumbers, orientation, margins, pageSize, lineSpacing, bgUrl, bgSize, bgOpacity, bgPaddingTop, bgMarginTop, bgMarginLeft, bgMarginRight, bgMarginSide });

    console.log(`✅ [API POST /templates] Template "${result.id}" salvo com sucesso!`);
    res.status(201).json({
      sucesso: true,
      mensagem: 'Template salvo com sucesso!',
      dados: result
    });
  } catch (error) {
    console.error('❌ [API POST /templates] Erro ao salvar:', error);
    res.status(400).json({ sucesso: false, erro: error.message });
  }
});

/** PUT /api/templates/:id - Update existing template */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, html, headerHtml, footerHtml, headerImageUrl, headerImageWidth, headerImageHeight, headerImageAlign, headerImageFit, footerImageUrl, footerImageWidth, footerImageHeight, footerImageAlign, footerImageFit, showPageNumbers, orientation, margins, pageSize, lineSpacing, bgUrl, bgSize, bgOpacity, bgPaddingTop, bgMarginTop, bgMarginLeft, bgMarginRight, bgMarginSide } = req.body || {};
    console.log(`🔄 [API PUT /templates/${id}] Atualizando template... bgUrl enviado: ${bgUrl ? 'SIM' : 'NÃO'}`);

    const result = await saveTemplate({ id, name, description, html, headerHtml, footerHtml, headerImageUrl, headerImageWidth, headerImageHeight, headerImageAlign, headerImageFit, footerImageUrl, footerImageWidth, footerImageHeight, footerImageAlign, footerImageFit, showPageNumbers, orientation, margins, pageSize, lineSpacing, bgUrl, bgSize, bgOpacity, bgPaddingTop, bgMarginTop, bgMarginLeft, bgMarginRight, bgMarginSide });

    console.log(`✅ [API PUT /templates/${id}] Template atualizado com sucesso!`);
    res.status(200).json({
      sucesso: true,
      mensagem: 'Template atualizado com sucesso!',
      dados: result
    });
  } catch (error) {
    console.error(`❌ [API PUT /templates/${req.params.id}] Erro ao atualizar:`, error);
    res.status(400).json({ sucesso: false, erro: error.message });
  }
});

/** DELETE /api/templates/:id - Delete custom template */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🗑️ [API DELETE /templates/${id}] Excluindo template...`);
    const result = await deleteTemplate(id);

    res.status(200).json({
      sucesso: true,
      ...result
    });
  } catch (error) {
    console.error(`❌ [API DELETE /templates/${req.params.id}] Erro ao excluir:`, error);
    res.status(400).json({ sucesso: false, erro: error.message });
  }
});

/** POST /api/templates/:id/gerar - Generate filled document (HTML or PDF) */
router.post('/:id/gerar', async (req, res) => {
  try {
    const { id } = req.params;
    const { campos, format = 'html', retornaPdf = false, showPageNumbers, bgUrl, headerImageUrl, headerImageWidth, headerImageHeight, headerImageAlign, headerImageFit, footerImageUrl, footerImageWidth, footerImageHeight, footerImageAlign, footerImageFit, bgSize, bgOpacity, bgPaddingTop, bgMarginTop, bgMarginLeft, bgMarginRight, bgMarginSide } = req.body || {};
    
    console.log(`⚡ [API /templates/${id}/gerar] Solicitação de geração recebida! (retornaPdf=${retornaPdf || req.query.download === 'true'})`);

    const template = await getTemplateById(id);
    if (!template) {
      console.warn(`⚠️ [API /templates/${id}/gerar] Template ID "${id}" não encontrado.`);
      return res.status(404).json({ sucesso: false, erro: 'Template não encontrado.' });
    }

    const data = campos || req.body || {};
    
    // Fill dynamic variables
    let bodyPreenchido = fillTemplate(template.html, data);
    bodyPreenchido = preencherTemplate(bodyPreenchido, data);

    // Determine effective background URL
    let effectiveBgUrl = bgUrl || template.bgUrl;
    if (!effectiveBgUrl) {
      const bgMatch = template.html.match(/data-bg-src=["']([^"']+)["']/i) || template.html.match(/<img[^>]+src=["']([^"']+)["']/i);
      if (bgMatch) effectiveBgUrl = bgMatch[1];
    }

    console.log(`🖼️ [API /templates/${id}/gerar] bgUrl Efetivo: ${effectiveBgUrl ? 'PRESENTE (tamanho: ' + effectiveBgUrl.length + ')' : 'NENHUMA IMAGEM ENCONTRADA!'}`);

    // If HTML requested or format === 'html'
    if (format === 'html' && !retornaPdf && req.query.download !== 'true') {
      return res.status(200).json({
        sucesso: true,
        modelo: id,
        html: bodyPreenchido,
        variaveisUtilizadas: template.variables
      });
    }

    // Compile standalone full HTML with embedded PDF background layer
    const fullHtmlForPdf = compileFullDocumentHtml({
      bodyHtml: bodyPreenchido,
      headerHtml: template.headerHtml || '',
      footerHtml: template.footerHtml || '',
      headerImageUrl: headerImageUrl || template.headerImageUrl || '',
      headerImageWidth: headerImageWidth || template.headerImageWidth || '100%',
      headerImageHeight: headerImageHeight || template.headerImageHeight || '100',
      headerImageAlign: headerImageAlign || template.headerImageAlign || 'center',
      headerImageFit: headerImageFit || template.headerImageFit || 'contain',
      footerImageUrl: footerImageUrl || template.footerImageUrl || '',
      footerImageWidth: footerImageWidth || template.footerImageWidth || '100%',
      footerImageHeight: footerImageHeight || template.footerImageHeight || '80',
      footerImageAlign: footerImageAlign || template.footerImageAlign || 'center',
      footerImageFit: footerImageFit || template.footerImageFit || 'contain',
      showPageNumbers: showPageNumbers !== undefined ? showPageNumbers : (template.showPageNumbers !== false),
      title: template.name || 'Documento Gerado',
      orientation: template.orientation || 'portrait',
      margins: template.margins || 'normal',
      pageSize: template.pageSize || 'a4',
      lineSpacing: template.lineSpacing || '1.6',
      bgUrl: effectiveBgUrl,
      bgSize: bgSize || template.bgSize || '100% 297mm',
      bgOpacity: bgOpacity || template.bgOpacity || '1.0',
      bgPaddingTop: bgPaddingTop || template.bgPaddingTop || '100px',
      bgMarginTop: bgMarginTop || template.bgMarginTop || '0px',
      bgMarginSide: bgMarginSide || template.bgMarginSide || '0px'
    });

    console.log(`📜 [API /templates/${id}/gerar] HTML compilado para PDF. Possui pdf-bg-layer: ${fullHtmlForPdf.includes('pdf-bg-layer')}`);

    // PDF generation with Puppeteer
    console.log('🚀 [API /templates/gerar] Iniciando navegador Puppeteer...');
    const isLandscape = template.orientation === 'landscape';
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    page.on('console', msg => console.log('  [PUPPETEER LOG]:', msg.text()));
    page.on('pageerror', err => console.error('  [PUPPETEER PAGE ERROR]:', err.message));

    console.log('⏳ [API /templates/gerar] Renderizando HTML no Puppeteer (networkidle0)...');
    await page.setContent(fullHtmlForPdf, { waitUntil: 'networkidle0', timeout: 30000 });
    await page.emulateMediaType('print');

    console.log('🖨️ [API /templates/gerar] Gerando buffer do PDF (margem 0mm)...');
    const pdfBuffer = await page.pdf({
      format: (template.pageSize || 'A4').toUpperCase(),
      landscape: isLandscape,
      printBackground: true,
      margin: { top: '0mm', bottom: '0mm', left: '0mm', right: '0mm' }
    });

    await browser.close();
    console.log(`✅ [API /templates/gerar] PDF gerado com sucesso! Tamanho final: ${pdfBuffer.length} bytes`);

    // Integre com Clicksign se a flag enviarClicksign / enviarParaClicksign for enviada no body
    if (req.body.enviarClicksign || req.body.enviarParaClicksign) {
      console.log('✍️ [API /templates/gerar] Enviando PDF gerado para o Clicksign...');
      const clicksignResult = await enviarParaClicksign(req.body, pdfBuffer);
      return res.status(200).json({
        sucesso: clicksignResult.success,
        mensagem: clicksignResult.success ? 'Documento gerado e enviado para Clicksign com sucesso!' : 'Falha ao enviar para Clicksign',
        modelo: id,
        clicksign: clicksignResult,
        pdfBase64: pdfBuffer.toString('base64'),
        variaveisUtilizadas: template.variables
      });
    }

    if (retornaPdf || req.query.download === 'true') {
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${id}_gerado.pdf"`,
      });
      return res.send(pdfBuffer);
    }

    res.status(200).json({
      sucesso: true,
      mensagem: 'Documento PDF gerado com sucesso',
      modelo: id,
      pdfBase64: pdfBuffer.toString('base64'),
      variaveisUtilizadas: template.variables
    });

  } catch (error) {
    console.error(`❌ [API /templates/${req.params.id}/gerar] Erro na geração do PDF:`, error);
    res.status(500).json({ sucesso: false, erro: error.message });
  }
});

export default router;
