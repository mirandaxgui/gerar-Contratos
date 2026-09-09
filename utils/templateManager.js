import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { supabase, TABLE_NAME } from './supabaseClient.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATES_DIR = path.resolve(__dirname, '../templates');
const REGISTRY_FILE = path.join(TEMPLATES_DIR, 'templates-registry.json');

/** Ensure templates directory and registry file exist */
function initRegistry() {
  if (!fs.existsSync(TEMPLATES_DIR)) {
    fs.mkdirSync(TEMPLATES_DIR, { recursive: true });
  }

  if (!fs.existsSync(REGISTRY_FILE)) {
    const initialData = [];
    fs.writeFileSync(REGISTRY_FILE, JSON.stringify(initialData, null, 2), 'utf8');
  }
}

/** Clean and post-process imported HTML, preserving full-page background images */
function postProcessImportedHtml(rawHtml = '') {
  if (!rawHtml) return '';

  let html = rawHtml;

  // 1. Normalize placeholders: {{ var }} -> {{var}}, {{(var)}} -> {{var}}
  html = html.replace(/{{\s*\(?\s*([a-zA-Z0-9_]+)\s*\)?\s*}}/g, '{{$1}}');

  // 2. Remove excessive consecutive empty <p></p> or <p>&nbsp;</p> or <p><br></p> (limit to max 1)
  html = html.replace(/(<p>\s*(<br\s*\/?>|&nbsp;|\s*)\s*<\/p>\s*){2,}/gi, '<p><br></p>');

  // 3. Extract full-page template background image if present in HTML
  const imgMatch = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  let bgLayerHtml = '';

  if (imgMatch && imgMatch[1]) {
    const bgSrc = imgMatch[1];
    // Remove inline <img> tags so they don't break paragraph flow
    html = html.replace(/<p>\s*<img[^>]+>\s*<\/p>/gi, '').replace(/<img[^>]+>/gi, '');
    
    bgLayerHtml = `
      <div class="page-background-layer" data-bg-src="${bgSrc}">
        <img src="${bgSrc}" alt="Template Background" />
      </div>
    `;
  }

  // 4. Ensure tables have proper borders & collapse styling
  html = html.replace(/<table\s*/gi, '<table style="width: 100%; border-collapse: collapse; margin: 15px 0;" ');
  html = html.replace(/<td\s*/gi, '<td style="border: 1px solid #d1d5db; padding: 8px 12px;" ');
  html = html.replace(/<th\s*/gi, '<th style="border: 1px solid #d1d5db; padding: 8px 12px; background-color: #f3f4f6; font-weight: 600;" ');

  // Wrap inside content layer over background
  if (bgLayerHtml) {
    return `${bgLayerHtml}<div class="page-content-layer">${html}</div>`;
  }

  return html;
}

/** Convert DOCX file buffer to high-fidelity HTML using Mammoth */
export async function convertDocxToHtml(fileBuffer) {
  if (!fileBuffer) {
    throw new Error('Nenhum buffer de arquivo foi fornecido.');
  }
  try {
    const mammoth = await import('mammoth');

    const conversionResult = await mammoth.default.convertToHtml(
      { buffer: fileBuffer },
      {
        convertImage: mammoth.default.images.imgElement(async (image) => {
          try {
            const imageBuffer = await image.read('base64');
            const contentType = image.contentType || 'image/png';
            return {
              src: `data:${contentType};base64,${imageBuffer}`
            };
          } catch (imgErr) {
            console.warn('⚠️ Erro ao converter imagem inline do DOCX:', imgErr.message);
            return { src: '' };
          }
        })
      }
    );

    let html = conversionResult.value || '';
    html = postProcessImportedHtml(html);

    return {
      html,
      headerHtml: '',
      footerHtml: '',
      warnings: conversionResult.warnings
    };
  } catch (err) {
    console.error('Erro ao converter DOCX para HTML:', err);
    throw new Error(`Falha ao converter arquivo DOCX: ${err.message}`);
  }
}

/** Extract unique dynamic variables matching {{variable_name}} or {{(variable_name)}} */
export function extractVariables(html = '') {
  if (!html || typeof html !== 'string') return [];
  const matches = html.match(/{{(.*?)}}/g) || [];
  const varsSet = new Set();

  matches.forEach(match => {
    let varName = match.replace(/[{}]/g, '').trim();
    varName = varName.replace(/^[\(\s]+|[\)\s]+$/g, '').trim();
    if (varName && varName !== 'BASE64_FONT' && varName !== 'CAMINHO_FONT' && varName !== 'tabelaExames') {
      varsSet.add(varName);
    }
  });

  return Array.from(varsSet);
}

/** Helper to generate clean URL slug/ID */
function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_\s-]/g, '')
    .replace(/\s+/g, '_')
    .replace(/-+/g, '_');
}

/** Get list of built-in templates */
function getBuiltInTemplates() {
  return [
    {
      id: 'contratoCredenciada',
      name: 'Contrato de Credenciamento',
      description: 'Modelo oficial de contrato para empresas credenciadas',
      type: 'builtin',
      filename: 'contratoCredenciada.html'
    },
    {
      id: 'propostaFarmer',
      name: 'Proposta Comercial - Farmer',
      description: 'Modelo de proposta comercial para clientes Farmer',
      type: 'builtin',
      filename: 'propostaFarmer.html'
    },
    {
      id: 'propostaHunter',
      name: 'Proposta Comercial - Hunter',
      description: 'Modelo de proposta comercial para clientes Hunter',
      type: 'builtin',
      filename: 'propostaHunter.html'
    },
    {
      id: 'propostaPeriodico',
      name: 'Proposta Comercial - Periódicos',
      description: 'Modelo de proposta comercial para exames periódicos',
      type: 'builtin',
      filename: 'propostaPeriodico.html'
    }
  ];
}

/** Read registry file */
function readRegistry() {
  initRegistry();
  try {
    const raw = fs.readFileSync(REGISTRY_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    console.error('Error reading template registry:', error);
    return [];
  }
}

/** Write registry file */
function writeRegistry(registry) {
  initRegistry();
  fs.writeFileSync(REGISTRY_FILE, JSON.stringify(registry, null, 2), 'utf8');
}

/** Helper: converter linha do banco de dados (snake_case) para objeto Template (camelCase) */
function mapRowToTemplate(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    type: row.type || 'custom',
    html: row.html || '',
    headerHtml: row.header_html || '',
    footerHtml: row.footer_html || '',
    headerImageUrl: row.header_image_url || '',
    headerImageWidth: row.header_image_width || '100%',
    headerImageHeight: row.header_image_height || '100',
    headerImageAlign: row.header_image_align || 'center',
    headerImageFit: row.header_image_fit || 'contain',
    footerImageUrl: row.footer_image_url || '',
    footerImageWidth: row.footer_image_width || '100%',
    footerImageHeight: row.footer_image_height || '80',
    footerImageAlign: row.footer_image_align || 'center',
    footerImageFit: row.footer_image_fit || 'contain',
    showPageNumbers: row.show_page_numbers !== false,
    orientation: row.orientation || 'portrait',
    margins: row.margins || 'normal',
    pageSize: row.page_size || 'a4',
    lineSpacing: row.line_spacing || '1.6',
    bgUrl: row.bg_url || '',
    bgSize: row.bg_size || '100% 297mm',
    bgOpacity: row.bg_opacity !== undefined ? String(row.bg_opacity) : '1.0',
    bgPaddingTop: row.bg_padding_top || '130px',
    bgMarginTop: row.bg_margin_top || '0px',
    bgMarginLeft: row.bg_margin_left || '0px',
    bgMarginRight: row.bg_margin_right || '0px',
    bgMarginSide: row.bg_margin_side || '0px',
    variables: Array.isArray(row.variables) ? row.variables : extractVariables((row.html || '') + ' ' + (row.header_html || '') + ' ' + (row.footer_html || '')),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

/** Helper: converter objeto Template (camelCase) para formato do banco de dados (snake_case) */
function mapTemplateToRow(data) {
  const vars = extractVariables((data.html || '') + ' ' + (data.headerHtml || '') + ' ' + (data.footerHtml || ''));
  return {
    id: data.id,
    name: data.name.trim(),
    description: (data.description || '').trim(),
    type: data.type || 'custom',
    html: data.html || '',
    header_html: data.headerHtml || '',
    footer_html: data.footerHtml || '',
    header_image_url: data.headerImageUrl || '',
    header_image_width: data.headerImageWidth || '100%',
    header_image_height: data.headerImageHeight || '100',
    header_image_align: data.headerImageAlign || 'center',
    header_image_fit: data.headerImageFit || 'contain',
    footer_image_url: data.footerImageUrl || '',
    footer_image_width: data.footerImageWidth || '100%',
    footer_image_height: data.footerImageHeight || '80',
    footer_image_align: data.footerImageAlign || 'center',
    footer_image_fit: data.footerImageFit || 'contain',
    show_page_numbers: data.showPageNumbers !== false,
    orientation: data.orientation || 'portrait',
    margins: data.margins || 'normal',
    page_size: data.pageSize || 'a4',
    line_spacing: data.lineSpacing || '1.6',
    bg_url: data.bgUrl || '',
    bg_size: data.bgSize || '100% 297mm',
    bg_opacity: parseFloat(data.bgOpacity) || 1.0,
    bg_padding_top: data.bgPaddingTop || '130px',
    bg_margin_top: data.bgMarginTop || '0px',
    bg_margin_left: data.bgMarginLeft || data.bgMarginSide || '0px',
    bg_margin_right: data.bgMarginRight || data.bgMarginSide || '0px',
    bg_margin_side: data.bgMarginSide || data.bgMarginLeft || '0px',
    variables: vars,
    updated_at: new Date().toISOString()
  };
}

/** Get all templates (Supabase + Official Builtins) */
export async function getAllTemplates() {
  let customTemplates = [];
  
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .order('updated_at', { ascending: false });

    if (!error && Array.isArray(data)) {
      customTemplates = data.map(mapRowToTemplate);
    } else {
      if (error) console.warn('⚠️ [SUPABASE] Aviso ao buscar templates do Supabase:', error.message);
      customTemplates = readRegistry();
    }
  } catch (err) {
    console.warn('⚠️ [SUPABASE] Erro ao consultar Supabase (usando fallback local):', err.message);
    customTemplates = readRegistry();
  }

  const builtIns = getBuiltInTemplates().map(bt => {
    const filePath = path.join(TEMPLATES_DIR, bt.filename);
    let variables = [];
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      variables = extractVariables(content);
    }
    return {
      ...bt,
      variables,
      orientation: 'portrait',
      margins: 'normal',
      pageSize: 'a4',
      lineSpacing: '1.6',
      createdAt: null,
      updatedAt: null
    };
  });

  const customIds = new Set(customTemplates.map(t => t.id));
  const uniqueBuiltins = builtIns.filter(b => !customIds.has(b.id));

  return [...customTemplates, ...uniqueBuiltins];
}

/** Get a specific template by ID */
export async function getTemplateById(id) {
  if (!id) return null;
  
  // 1. Check official builtins on disk
  const builtIns = getBuiltInTemplates();
  const builtinMeta = builtIns.find(t => t.id === id);
  if (builtinMeta) {
    const filePath = path.join(TEMPLATES_DIR, builtinMeta.filename);
    if (fs.existsSync(filePath)) {
      const html = fs.readFileSync(filePath, 'utf8');
      return {
        ...builtinMeta,
        html,
        variables: extractVariables(html),
        orientation: 'portrait',
        margins: 'normal',
        pageSize: 'a4',
        lineSpacing: '1.6'
      };
    }
  }

  // 2. Query Supabase document_templates table
  try {
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (!error && data) {
      return mapRowToTemplate(data);
    }
  } catch (err) {
    console.warn(`⚠️ [SUPABASE] Erro ao buscar template "${id}" no Supabase:`, err.message);
  }

  // 3. Fallback to local registry / disk
  const allLocal = readRegistry();
  const localMeta = allLocal.find(t => t.id === id);
  if (localMeta) {
    const filePath = path.join(TEMPLATES_DIR, localMeta.filename || `${localMeta.id}.html`);
    if (fs.existsSync(filePath)) {
      const html = fs.readFileSync(filePath, 'utf8');
      return { ...localMeta, html };
    }
  }

  return null;
}

/** Save or update a template */
export async function saveTemplate({
  id,
  name,
  description,
  html,
  headerHtml = '',
  footerHtml = '',
  headerImageUrl = '',
  headerImageWidth = '100%',
  headerImageHeight = '100',
  headerImageAlign = 'center',
  headerImageFit = 'contain',
  footerImageUrl = '',
  footerImageWidth = '100%',
  footerImageHeight = '80',
  footerImageAlign = 'center',
  footerImageFit = 'contain',
  showPageNumbers = true,
  orientation = 'portrait',
  margins = 'normal',
  pageSize = 'a4',
  lineSpacing = '1.6',
  bgUrl = '',
  bgSize = '100% auto',
  bgOpacity = '1.0',
  bgPaddingTop = '130px',
  bgMarginTop = '0px',
  bgMarginLeft = '0px',
  bgMarginRight = '0px',
  bgMarginSide = '0px'
}) {
  initRegistry();
  
  if (!name || !name.trim()) {
    throw new Error('O nome do template é obrigatório.');
  }
  if (!html || !html.trim()) {
    throw new Error('O conteúdo do template é obrigatório.');
  }

  const templateId = id ? id.trim() : (slugify(name) || `template_${Date.now()}`);
  let extractedBgUrl = bgUrl;
  if (!extractedBgUrl) {
    const bgMatch = html.match(/data-bg-src=["']([^"']+)["']/i) || html.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (bgMatch) extractedBgUrl = bgMatch[1];
  }

  const payload = {
    id: templateId,
    name,
    description,
    type: 'custom',
    html,
    headerHtml,
    footerHtml,
    headerImageUrl,
    headerImageWidth,
    headerImageHeight,
    headerImageAlign,
    headerImageFit,
    footerImageUrl,
    footerImageWidth,
    footerImageHeight,
    footerImageAlign,
    footerImageFit,
    showPageNumbers,
    orientation,
    margins,
    pageSize,
    lineSpacing,
    bgUrl: extractedBgUrl,
    bgSize,
    bgOpacity,
    bgPaddingTop,
    bgMarginTop,
    bgMarginLeft,
    bgMarginRight,
    bgMarginSide
  };

  const row = mapTemplateToRow(payload);

  // 1. Save in Supabase document_templates table
  try {
    const { data: upsertData, error } = await supabase
      .from(TABLE_NAME)
      .upsert(row)
      .select('*')
      .maybeSingle();

    if (error) {
      console.error('❌ [SUPABASE] Erro ao salvar template no Supabase:', error.message);
    } else {
      console.log(`✅ [SUPABASE] Template "${templateId}" salvo com sucesso no Supabase!`);
    }
  } catch (err) {
    console.error('❌ [SUPABASE] Exceção ao salvar template no Supabase:', err.message);
  }

  // 2. Backup on local disk & registry
  try {
    const registry = readRegistry();
    const filename = `${templateId}.html`;
    const filePath = path.join(TEMPLATES_DIR, filename);
    const now = new Date().toISOString();
    const existingIndex = registry.findIndex(t => t.id === templateId);

    const metadata = {
      id: templateId,
      name: name.trim(),
      description: (description || '').trim(),
      type: 'custom',
      filename,
      variables: row.variables,
      headerHtml: headerHtml || '',
      footerHtml: footerHtml || '',
      headerImageUrl: headerImageUrl || '',
      headerImageWidth: headerImageWidth || '100%',
      headerImageHeight: headerImageHeight || '100',
      headerImageAlign: headerImageAlign || 'center',
      headerImageFit: headerImageFit || 'contain',
      footerImageUrl: footerImageUrl || '',
      footerImageWidth: footerImageWidth || '100%',
      footerImageHeight: footerImageHeight || '80',
      footerImageAlign: footerImageAlign || 'center',
      footerImageFit: footerImageFit || 'contain',
      showPageNumbers: showPageNumbers !== false,
      orientation,
      margins,
      pageSize,
      lineSpacing,
      bgUrl: extractedBgUrl,
      bgSize,
      bgOpacity,
      bgPaddingTop,
      bgMarginTop,
      bgMarginLeft: bgMarginLeft || bgMarginSide || '0px',
      bgMarginRight: bgMarginRight || bgMarginSide || '0px',
      bgMarginSide: bgMarginSide || bgMarginLeft || '0px',
      createdAt: existingIndex >= 0 ? registry[existingIndex].createdAt : now,
      updatedAt: now
    };

    const fullHtml = compileFullDocumentHtml({
      bodyHtml: html,
      headerHtml,
      footerHtml,
      headerImageUrl,
      headerImageWidth,
      headerImageHeight,
      headerImageAlign,
      headerImageFit,
      footerImageUrl,
      footerImageWidth,
      footerImageHeight,
      footerImageAlign,
      footerImageFit,
      title: name,
      orientation,
      margins,
      pageSize,
      lineSpacing,
      bgUrl: extractedBgUrl,
      bgSize,
      bgOpacity,
      bgPaddingTop,
      bgMarginTop,
      bgMarginLeft: metadata.bgMarginLeft,
      bgMarginRight: metadata.bgMarginRight
    });

    fs.writeFileSync(filePath, fullHtml, 'utf8');

    if (existingIndex >= 0) {
      registry[existingIndex] = metadata;
    } else {
      registry.unshift(metadata);
    }
    writeRegistry(registry);
  } catch (localErr) {
    console.warn('⚠️ Aviso ao salvar backup local do template:', localErr.message);
  }

  return mapRowToTemplate(row);
}

/** Delete a custom template */
export async function deleteTemplate(id) {
  initRegistry();
  
  // 1. Delete from Supabase document_templates
  try {
    const { error } = await supabase
      .from(TABLE_NAME)
      .delete()
      .eq('id', id);

    if (error) {
      console.error('❌ [SUPABASE] Erro ao excluir template do Supabase:', error.message);
    } else {
      console.log(`✅ [SUPABASE] Template "${id}" excluído com sucesso do Supabase!`);
    }
  } catch (err) {
    console.error('❌ [SUPABASE] Exceção ao excluir no Supabase:', err.message);
  }

  // 2. Also remove from local registry & disk
  const registry = readRegistry();
  const templateIndex = registry.findIndex(t => t.id === id);

  if (templateIndex >= 0) {
    const target = registry[templateIndex];
    const filePath = path.join(TEMPLATES_DIR, target.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    registry.splice(templateIndex, 1);
    writeRegistry(registry);
  }

  return { success: true, message: `Template "${id}" excluído com sucesso.` };
}

/** Fill placeholders in HTML with variable values */
export function fillTemplate(html, data = {}) {
  if (!html) return '';

  return html.replace(/{{\s*\(?\s*([a-zA-Z0-9_]+)\s*\)?\s*}}/g, (_, key) => {
    const k = (key || '').trim();
    if (!k) return '';
    
    const keys = k.split('.');
    let val = data;
    for (const subKey of keys) {
      if (val && typeof val === 'object' && subKey in val) {
        val = val[subKey];
      } else {
        val = undefined;
        break;
      }
    }

    if (val === undefined && data[k] !== undefined) {
      val = data[k];
    }

    return val !== undefined && val !== null ? String(val) : `{{${k}}}`;
  });
}

/** Server-side HTML pagination for PDF output */
function paginateBodyForPdf(bodyHtml, paddingTopPx = 130) {
  if (!bodyHtml) return [''];

  let cleanHtml = bodyHtml;
  cleanHtml = cleanHtml.replace(/<div[^>]*class=["']page-background-layer["'][^>]*>[\s\S]*?<\/div>/gi, '');
  cleanHtml = cleanHtml.replace(/<div[^>]*class=["']page-content-layer["'][^>]*>([\s\S]*?)<\/div>/gi, '$1');
  cleanHtml = cleanHtml.replace(/<div[^>]*class=["']a4-canvas-page-card[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi, '$1');

  const tags = cleanHtml.match(/<(p|h1|h2|h3|h4|h5|h6|table|ul|ol|blockquote|div)[^>]*>[\s\S]*?<\/\1>/gi) || [];

  if (tags.length === 0) {
    return [cleanHtml];
  }

  const A4_HEIGHT_PX = 1122.5;
  const PADDING_BOTTOM_PX = 75.5;
  const MAX_PAGE_HEIGHT = A4_HEIGHT_PX - paddingTopPx - PADDING_BOTTOM_PX;

  const pages = [];
  let currentPageHtml = '';
  let currentHeight = 0;

  tags.forEach((tag) => {
    const isExplicitBreak = tag.includes('a4-page-separator') || tag.includes('page-break') || tag.includes('QUEBRA DE PÁGINA');

    if (isExplicitBreak) {
      if (currentPageHtml.trim()) {
        pages.push(currentPageHtml);
      } else {
        pages.push('<p><br></p>');
      }
      currentPageHtml = '';
      currentHeight = 0;
      return;
    }

    const textContent = tag.replace(/<[^>]+>/g, '').trim();
    const lineCount = Math.max(1, Math.ceil(textContent.length / 70));
    let estHeight = lineCount * 24 + 16;
    if (tag.toLowerCase().startsWith('<h1') || tag.toLowerCase().startsWith('<h2')) estHeight += 26;
    if (tag.toLowerCase().startsWith('<table') || tag.toLowerCase().startsWith('<ol') || tag.toLowerCase().startsWith('<ul')) estHeight = 150;

    if (currentHeight + estHeight > MAX_PAGE_HEIGHT && currentPageHtml.trim()) {
      pages.push(currentPageHtml);
      currentPageHtml = tag;
      currentHeight = estHeight;
    } else {
      currentPageHtml += tag;
      currentHeight += estHeight;
    }
  });

  if (currentPageHtml.trim()) {
    pages.push(currentPageHtml);
  }

  return pages.length > 0 ? pages : [cleanHtml];
}

/** Wrap document body, header, footer, and print styles into a full standalone HTML document */
export function compileFullDocumentHtml({
  bodyHtml,
  headerHtml = '',
  footerHtml = '',
  headerImageUrl = '',
  headerImageWidth = '100%',
  headerImageHeight = '100',
  headerImageAlign = 'center',
  headerImageFit = 'contain',
  footerImageUrl = '',
  footerImageWidth = '100%',
  footerImageHeight = '80',
  footerImageAlign = 'center',
  footerImageFit = 'contain',
  title = 'Documento',
  orientation = 'portrait',
  margins = 'normal',
  pageSize = 'a4',
  lineSpacing = '1.6',
  bgUrl = '',
  bgSize = '100% auto',
  bgOpacity = '1.0',
  bgPaddingTop = '130px',
  bgMarginTop = '0px',
  bgMarginLeft = '0px',
  bgMarginRight = '0px',
  bgMarginSide = '0px',
  showPageNumbers = true
}) {
  const sizeVal = `${pageSize.toUpperCase()} ${orientation}`;

  let extractedBgUrl = bgUrl;
  if (!extractedBgUrl) {
    const bgMatch = bodyHtml.match(/data-bg-src=["']([^"']+)["']/i) || bodyHtml.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (bgMatch) extractedBgUrl = bgMatch[1];
  }

  const basePaddingTop = parseInt(bgPaddingTop) || 130;
  const headerHeightPx = (headerImageUrl && headerImageHeight) ? (parseInt(headerImageHeight) || 100) : 0;
  const paddingTopVal = headerImageUrl ? Math.max(basePaddingTop, headerHeightPx + 15) : basePaddingTop;

  const topOffset = parseInt(bgMarginTop) || 0;
  const leftOffset = parseInt(bgMarginLeft) || parseInt(bgMarginSide) || 0;
  const rightOffset = parseInt(bgMarginRight) || parseInt(bgMarginSide) || 0;

  const isHeaderFullBleed = headerImageWidth === '100%';
  const isFooterFullBleed = footerImageWidth === '100%';

  const headerAlignMargin = headerImageAlign === 'center' ? '0 auto' : (headerImageAlign === 'right' ? '0 0 0 auto' : '0 auto 0 0');
  const footerAlignMargin = footerImageAlign === 'center' ? '0 auto' : (footerImageAlign === 'right' ? '0 0 0 auto' : '0 auto 0 0');

  const pages = paginateBodyForPdf(bodyHtml, paddingTopVal);

  const pagesHtml = pages.map((pageContent, idx) => `
    <div class="pdf-page-card">
      ${extractedBgUrl ? `
      <div class="pdf-bg-layer" style="left: ${leftOffset}px; width: calc(210mm - ${leftOffset + rightOffset}px);">
        <img src="${extractedBgUrl}" alt="Background Page ${idx + 1}" />
      </div>` : ''}

      ${headerImageUrl && isHeaderFullBleed ? `
      <div class="pdf-header-img-layer" style="position: absolute; top: 0; left: 0; width: 210mm; z-index: 2; pointer-events: none;">
        <img src="${headerImageUrl}" style="width: 100%; max-height: ${headerImageHeight}px; height: auto; object-fit: ${headerImageFit}; display: block; margin: 0;" />
      </div>` : ''}

      <header class="document-header" style="${headerImageUrl && isHeaderFullBleed ? 'border-bottom: none;' : ''}">
        ${headerImageUrl && !isHeaderFullBleed ? `<img src="${headerImageUrl}" class="header-img" style="width: ${headerImageWidth}; max-height: ${headerImageHeight}px; height: auto; object-fit: ${headerImageFit}; display: block; margin: ${headerAlignMargin};" />` : ''}
        ${headerHtml ? headerHtml : ''}
      </header>

      <main class="document-body">
        ${pageContent}
      </main>

      ${footerImageUrl && isFooterFullBleed ? `
      <div class="pdf-footer-img-layer" style="position: absolute; bottom: 0; left: 0; width: 210mm; z-index: 2; pointer-events: none;">
        <img src="${footerImageUrl}" style="width: 100%; max-height: ${footerImageHeight}px; height: auto; object-fit: ${footerImageFit}; display: block; margin: 0;" />
      </div>` : ''}

      <footer class="document-footer" style="${footerImageUrl && isFooterFullBleed ? 'border-top: none;' : ''}">
        ${showPageNumbers !== false ? `<div class="page-counter" style="text-align: center; font-size: 11px; color: #64748b; margin-bottom: 6px; position: relative; z-index: 5;">Página ${idx + 1} de ${pages.length}</div>` : ''}
        ${footerImageUrl && !isFooterFullBleed ? `<img src="${footerImageUrl}" class="footer-img" style="width: ${footerImageWidth}; max-height: ${footerImageHeight}px; height: auto; object-fit: ${footerImageFit}; display: block; margin: ${footerAlignMargin};" />` : ''}
        ${footerHtml ? footerHtml : ''}
      </footer>
    </div>
  `).join('\n<div class="page-break"></div>\n');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,300;0,400;0,500;0,700;1,400&display=swap');

    @page {
      size: ${sizeVal};
      margin: 0;
    }

    * {
      box-sizing: border-box;
    }

    html, body {
      font-family: 'Roboto', 'Helvetica Neue', Arial, sans-serif;
      color: #1f2937;
      background-color: #ffffff;
      margin: 0;
      padding: 0;
      line-height: ${lineSpacing};
      font-size: 14px;
    }

    .pdf-page-card {
      width: 210mm;
      height: 297mm;
      position: relative;
      overflow: hidden;
      box-sizing: border-box;
      background-color: #ffffff;
      page-break-after: always;
      page-break-inside: avoid;
      break-after: page;
    }

    .pdf-bg-layer {
      position: absolute !important;
      top: ${topOffset}px !important;
      left: ${leftOffset}px !important;
      width: calc(210mm - ${leftOffset + rightOffset}px) !important;
      z-index: 0 !important;
      pointer-events: none !important;
    }

    .pdf-bg-layer img {
      width: 100% !important;
      height: auto !important;
      max-height: 297mm !important;
      object-fit: contain !important;
      object-position: top center !important;
      opacity: ${bgOpacity || '1.0'};
    }

    .document-body {
      position: relative !important;
      z-index: 1 !important;
      padding: ${paddingTopVal}px 15mm 20mm 15mm !important;
    }

    .document-header {
      position: relative;
      z-index: 1;
      width: 100%;
      padding: 15px 15mm 0 15mm;
      border-bottom: 2px solid #00652c;
    }

    .document-footer {
      position: absolute;
      bottom: 10mm;
      left: 15mm;
      right: 15mm;
      z-index: 1;
      border-top: 1px solid #e5e7eb;
      padding-top: 8px;
      font-size: 11px;
      color: #6b7280;
      text-align: center;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
    }

    table, th, td {
      border: 1px solid #d1d5db;
    }

    th {
      background-color: #f3f4f6;
      font-weight: 600;
      padding: 8px 12px;
      text-align: left;
    }

    td {
      padding: 8px 12px;
    }

    img {
      max-width: 100%;
      height: auto;
      display: block;
      margin: 12px auto;
    }

    ol, ul { padding-left: 28px; margin: 8px 0; }
    li { margin-bottom: 4px; line-height: 1.6; }
    ol ol { list-style-type: lower-alpha; margin-top: 4px; margin-bottom: 4px; }
    ol ol ol { list-style-type: lower-roman; }
    ul ul { list-style-type: circle; margin-top: 4px; margin-bottom: 4px; }
    ul ul ul { list-style-type: square; }

    ol.legal-list, ol[data-list-style="legal"] { counter-reset: legal-item; list-style-type: none !important; padding-left: 10px !important; }
    ol.legal-list > li, ol[data-list-style="legal"] > li { counter-increment: legal-item; position: relative; list-style-type: none !important; padding-left: 40px; margin-bottom: 6px; }
    ol.legal-list > li::before, ol[data-list-style="legal"] > li::before { content: counters(legal-item, ".") ". "; position: absolute; left: 0; top: 0; font-weight: 700; color: #0f172a; }

    /* HARD PAGE BREAK FOR PUPPETEER PDF GENERATION */
    .page-break {
      display: block !important;
      page-break-before: always !important;
      break-before: page !important;
      height: 0 !important;
      margin: 0 !important;
      padding: 0 !important;
      border: none !important;
      visibility: hidden !important;
      font-size: 0 !important;
      line-height: 0 !important;
      clear: both !important;
    }

    .callout {
      padding: 12px 16px;
      border-radius: 6px;
      margin: 15px 0;
      font-size: 14px;
    }

    .callout-info {
      background-color: #eff6ff;
      border-left: 4px solid #3b82f6;
      color: #1e40af;
    }

    .callout-success {
      background-color: #ecfdf5;
      border-left: 4px solid #10b981;
      color: #065f46;
    }

    .callout-warning {
      background-color: #fffbeb;
      border-left: 4px solid #f59e0b;
      color: #92400e;
    }

    .callout-danger {
      background-color: #fef2f2;
      border-left: 4px solid #ef4444;
      color: #991b1b;
    }
  </style>
</head>
<body>
  ${pagesHtml}
</body>
</html>`;
}
