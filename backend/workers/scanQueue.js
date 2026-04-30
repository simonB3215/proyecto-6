const { Queue, Worker } = require('bullmq');
const { createClient } = require('@supabase/supabase-js');
const scannerService = require('../services/scanner.service');
const pdfService = require('../services/pdf.service');
const { mapToControl } = require('../utils/iso27001_mapper');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

const redisOptions = {
    connection: {
        url: process.env.REDIS_URL || 'redis://localhost:6379',
    }
};

// Crear la cola
const scanQueue = new Queue('scans', redisOptions);

// Configurar el worker para procesar los trabajos
const worker = new Worker('scans', async job => {
    const { scanData, targetData } = job.data;
    console.log(`Iniciando procesamiento de escaneo para el job: ${job.id}, target: ${targetData.url}`);

    try {
        if (!supabase) throw new Error('Database not configured');

        const zapService = require('../services/zap.service');

        // Ejecutar Nmap y ZAP en paralelo
        const [rawNmapVulns, rawZapVulns] = await Promise.all([
            scannerService.performScan(targetData.url),
            zapService.performZapScan(targetData.url)
        ]);
        
        const rawVulnerabilities = [...rawNmapVulns, ...rawZapVulns];
        
        const vulnerabilitiesToInsert = rawVulnerabilities.map(v => ({
            scan_id: scanData.id,
            title: v.title,
            description: v.description,
            severity: v.severity,
            iso_27001_control: mapToControl(v.type)
        }));

        // Insertar vulnerabilidades
        if (vulnerabilitiesToInsert.length > 0) {
            const { error: vulnError } = await supabase
                .from('vulnerabilities')
                .insert(vulnerabilitiesToInsert);
            if (vulnError) console.error("Error insertando vulnerabilidades:", vulnError);
        }

        // Generar PDF
        const pdfUrl = await pdfService.generateAndUploadPdf(
            scanData.id, 
            targetData.url, 
            vulnerabilitiesToInsert
        );

        // Actualizar registro del scan a completed
        await supabase
            .from('scans')
            .update({ 
                status: 'completed', 
                completed_at: new Date().toISOString(),
                pdf_url: pdfUrl
            })
            .eq('id', scanData.id);

        console.log(`Escaneo completado con éxito: ${scanData.id}`);

    } catch (err) {
        console.error('Proceso de escaneo falló en el worker:', err);
        if (supabase) {
            await supabase
                .from('scans')
                .update({ status: 'failed' })
                .eq('id', scanData.id);
        }
        throw err; // Lanza error para que BullMQ lo marque como fallido
    }
}, redisOptions);

worker.on('completed', job => {
    console.log(`${job.id} has completed!`);
});

worker.on('failed', (job, err) => {
    console.log(`${job.id} has failed with ${err.message}`);
});

module.exports = {
    scanQueue
};
