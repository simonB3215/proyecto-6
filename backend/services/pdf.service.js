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

        // Contenido del PDF
        doc.fontSize(24).text('Antigravity', { align: 'center' });
        doc.fontSize(16).text('Reporte de Auditoría de Ciberseguridad', { align: 'center' });
        doc.moveDown(2);
        
        doc.fontSize(12).text(`Objetivo: ${targetUrl}`);
        doc.text(`Fecha: ${new Date().toLocaleDateString()}`);
        doc.text(`ID de Escaneo: ${scanId}`);
        doc.moveDown(2);
        
        doc.fontSize(16).text('Hallazgos y Mapeo ISO 27001', { underline: true });
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
