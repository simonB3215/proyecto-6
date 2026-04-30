const puppeteer = require('puppeteer');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs').promises;
const path = require('path');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

function calculateLegalScore(vulnerabilities) {
    let score = 100;
    vulnerabilities.forEach(v => {
        if (v.severity === 'critical') score -= 20;
        if (v.severity === 'high') score -= 10;
        if (v.severity === 'medium') score -= 5;
    });
    if (score < 0) score = 0;

    let scoreColor = 'border-green-500';
    if (score < 50) scoreColor = 'border-red-500';
    else if (score < 80) scoreColor = 'border-yellow-500';

    return { score, scoreColor };
}

async function generateAndUploadPdf(scanId, targetUrl, vulnerabilities) {
    if (!supabase) throw new Error("Supabase credentials not configured in backend");

    try {
        // 1. Leer plantilla HTML
        const templatePath = path.join(__dirname, '../templates/report_qpr.html');
        let htmlContent = await fs.readFile(templatePath, 'utf8');

        // 2. Procesar datos
        const { score, scoreColor } = calculateLegalScore(vulnerabilities);
        const dateStr = new Date().toLocaleDateString();
        
        let vulnsHtml = vulnerabilities.map(v => `
        <div class="mb-6 p-6 bg-gray-800 rounded-lg border border-gray-700 break-inside-avoid">
            <h4 class="text-lg font-bold text-red-400 mb-2">[${(v.severity || 'low').toUpperCase()}] ${v.title}</h4>
            <div class="mb-3">
                <span class="font-semibold text-blue-400">Impacto de Negocio (Question):</span>
                <p class="text-gray-300 text-sm mt-1">¿Cómo afecta esto a la operación? Esta vulnerabilidad podría exponer información confidencial o interrumpir servicios, afectando la confianza del cliente y el cumplimiento normativo.</p>
            </div>
            <div class="mb-3">
                <span class="font-semibold text-orange-400">Descripción Técnica (Problem):</span>
                <p class="text-gray-300 text-sm mt-1">${v.description}</p>
            </div>
            <div class="mb-3">
                <span class="font-semibold text-green-400">Guía de Corrección (Resolution):</span>
                <p class="text-gray-300 text-sm mt-1">Se recomienda remediar el hallazgo siguiendo las mejores prácticas para el control normativo: <strong>ISO 27001 - ${v.iso_27001_control || 'N/A'}</strong>.</p>
            </div>
        </div>
        `).join('');

        if (vulnerabilities.length === 0) {
            vulnsHtml = '<p class="text-green-400 font-bold">Excelente. No se detectaron vulnerabilidades en el análisis.</p>';
        }

        // 3. Reemplazar variables en HTML
        htmlContent = htmlContent
            .replace('{{TARGET_URL}}', targetUrl)
            .replace('{{DATE}}', dateStr)
            .replace('{{VULN_COUNT}}', vulnerabilities.length)
            .replace('{{SCORE_COLOR}}', scoreColor)
            .replace('{{LEGAL_SCORE}}', score)
            .replace('{{VULNERABILITIES_HTML}}', vulnsHtml);

        // 4. Renderizar PDF con Puppeteer
        const browser = await puppeteer.launch({ 
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox'] // Importante para entornos Docker/Server
        });
        const page = await browser.newPage();
        
        // Cargar el HTML (esperar a que networkidle0 para que Tailwind CDN se cargue si hay internet, 
        // aunque es mejor cargar los estilos localmente, dejaremos CDN por MVP)
        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' }
        });

        await browser.close();

        // 5. Subir a Supabase
        const fileName = `${scanId}.pdf`;
        const { data, error } = await supabase.storage
            .from('reports')
            .upload(fileName, pdfBuffer, {
                contentType: 'application/pdf',
                upsert: true
            });
        
        if (error) throw error;
        
        // Obtener URL pública (o generar url firmada en el endpoint que la pide)
        const { data: publicUrlData } = supabase.storage
            .from('reports')
            .getPublicUrl(fileName);
        
        return publicUrlData.publicUrl;

    } catch (err) {
        console.error("Error generando/subiendo el PDF con Puppeteer:", err);
        throw err;
    }
}

module.exports = { generateAndUploadPdf };
