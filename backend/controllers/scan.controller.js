const { createClient } = require('@supabase/supabase-js');
const scannerService = require('../services/scanner.service');
const pdfService = require('../services/pdf.service');
const { mapToControl } = require('../utils/iso27001_mapper');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

const startScan = async (req, res) => {
    try {
        if (!supabase) return res.status(500).json({ error: 'Database not configured' });

        const { target_id, user_id } = req.body;
        if (!target_id || !user_id) {
            return res.status(400).json({ error: 'target_id and user_id are required' });
        }

        // 1. Obtener Info del Target
        const { data: targetData, error: targetError } = await supabase
            .from('targets')
            .select('*')
            .eq('id', target_id)
            .single();

        if (targetError || !targetData) {
            return res.status(404).json({ error: 'Target not found' });
        }

        // 2. Crear Registro de Scan (in_progress)
        const { data: scanData, error: scanError } = await supabase
            .from('scans')
            .insert({
                target_id,
                user_id,
                status: 'in_progress'
            })
            .select()
            .single();

        if (scanError) {
            return res.status(500).json({ error: 'Failed to create scan record' });
        }

        // Responder inmediatamente para que no sea bloqueante (Async Flow)
        res.status(202).json({ 
            message: 'Scan started', 
            scan_id: scanData.id 
        });

        // 3. Ejecutar el Escaneo (En background)
        // En un entorno de producción, esto iría a una cola (RabbitMQ/BullMQ)
        (async () => {
            try {
                const rawVulnerabilities = await scannerService.performScan(targetData.url);
                
                const vulnerabilitiesToInsert = rawVulnerabilities.map(v => ({
                    scan_id: scanData.id,
                    title: v.title,
                    description: v.description,
                    severity: v.severity,
                    iso_27001_control: mapToControl(v.type)
                }));

                // Insertar vulnerabilidades si existen
                if (vulnerabilitiesToInsert.length > 0) {
                    const { error: vulnError } = await supabase
                        .from('vulnerabilities')
                        .insert(vulnerabilitiesToInsert);
                    if (vulnError) console.error("Error inserting vulns:", vulnError);
                }

                // 4. Generar PDF
                const pdfUrl = await pdfService.generateAndUploadPdf(
                    scanData.id, 
                    targetData.url, 
                    vulnerabilitiesToInsert
                );

                // 5. Actualizar registro del scan a completed
                await supabase
                    .from('scans')
                    .update({ 
                        status: 'completed', 
                        completed_at: new Date().toISOString(),
                        pdf_url: pdfUrl
                    })
                    .eq('id', scanData.id);

            } catch (err) {
                console.error('Proceso de escaneo falló:', err);
                await supabase
                    .from('scans')
                    .update({ status: 'failed' })
                    .eq('id', scanData.id);
            }
        })(); // Self-invoking async function to run in background

    } catch (error) {
        console.error('Error starting scan:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

const getScan = async (req, res) => {
    try {
        if (!supabase) return res.status(500).json({ error: 'Database not configured' });

        const { id } = req.params;
        const { data, error } = await supabase
            .from('scans')
            .select(`
                *, 
                targets(url), 
                vulnerabilities(*)
            `)
            .eq('id', id)
            .single();
            
        if (error || !data) return res.status(404).json({ error: 'Scan not found' });
        
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

module.exports = { startScan, getScan };
