const PDFDocument = require('pdfkit');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
// Evitar errores si no hay variables de entorno (útil en dev sin env)
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

async function generateAndUploadPdf(scanId, targetUrl, vulnerabilities) {
    if (!supabase) throw new Error("Supabase credentials not configured in backend");

    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 50 });
        const buffers = [];
        
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', async () => {
            const pdfData = Buffer.concat(buffers);
            const fileName = `${scanId}.pdf`;
            
            try {
                // Upload a Supabase Storage
                const { data, error } = await supabase.storage
                    .from('reports')
                    .upload(fileName, pdfData, {
                        contentType: 'application/pdf',
                        upsert: true
                    });
                
                if (error) throw error;
                
                // Obtener URL pública
                const { data: publicUrlData } = supabase.storage
                    .from('reports')
                    .getPublicUrl(fileName);
                
                resolve(publicUrlData.publicUrl);
            } catch (err) {
                console.error("Error subiendo el PDF:", err);
                reject(err);
            }
        });

        // Contenido del PDF (Diseño Corporativo Aegis)
        doc.rect(0, 0, doc.page.width, 100).fill('#0f172a');
        doc.fontSize(28).fillColor('#00ff88').text('Aegis CyberAudit', 50, 40, { align: 'left' });
        doc.fontSize(12).fillColor('#94a3b8').text('Enterprise Security Report', 50, 75, { align: 'left' });
        
        doc.moveDown(4);
        doc.fontSize(16).fillColor('#0f172a').text('Resumen Ejecutivo', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(12).fillColor('#334155').text(`Objetivo Auditado: ${targetUrl}`);
        doc.text(`Fecha del Escaneo: ${new Date().toLocaleDateString()}`);
        doc.text(`ID de Auditoría: ${scanId}`);
        doc.moveDown(2);
        
        doc.fontSize(16).fillColor('#0f172a').text('Hallazgos y Mapeo Normativo (ISO 27001)', { underline: true });
        doc.moveDown();

        if (vulnerabilities.length === 0) {
            doc.fontSize(12).fillColor('green').text('No se encontraron vulnerabilidades en esta revisión básica.');
        } else {
            vulnerabilities.forEach((vuln, index) => {
                let color = 'black';
                if (vuln.severity === 'critical') color = 'darkred';
                else if (vuln.severity === 'high') color = 'red';
                else if (vuln.severity === 'medium') color = 'orange';

                doc.fontSize(14).fillColor(color).text(`${index + 1}. ${vuln.title} [${vuln.severity.toUpperCase()}]`);
                doc.fontSize(12).fillColor('black').text(`Descripción: ${vuln.description}`);
                doc.text(`Control ISO 27001: ${vuln.iso_27001_control}`);
                doc.moveDown();
            });
        }
        
        // Finalizar y desencadenar el evento 'end'
        doc.end();
    });
}

module.exports = { generateAndUploadPdf };
