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

        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ error: 'Unauthorized: Missing token' });
        const token = authHeader.split(' ')[1];

        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) return res.status(401).json({ error: 'Unauthorized: Invalid token' });

        const { target_id, user_id } = req.body;
        if (!target_id || !user_id) {
            return res.status(400).json({ error: 'target_id and user_id are required' });
        }

        if (user.id !== user_id) {
            return res.status(403).json({ error: 'Forbidden: You can only start scans for yourself' });
        }

        // 1. Obtener Info del Target (Validando que le pertenece al usuario)
        const { data: targetData, error: targetError } = await supabase
            .from('targets')
            .select('*')
            .eq('id', target_id)
            .eq('user_id', user.id)
            .single();

        if (targetError || !targetData) {
            return res.status(404).json({ error: 'Target not found or access denied' });
        }

        // 2. Crear Registro de Scan (in_progress)
        const { data: scanData, error: scanError } = await supabase
            .from('scans')
            .insert({
                target_id,
                user_id: user.id,
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

        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ error: 'Unauthorized: Missing token' });
        const token = authHeader.split(' ')[1];

        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) return res.status(401).json({ error: 'Unauthorized: Invalid token' });

        const { id } = req.params;
        const { data, error } = await supabase
            .from('scans')
            .select(`
                *, 
                targets(url), 
                vulnerabilities(*)
            `)
            .eq('id', id)
            .eq('user_id', user.id)
            .single();
            
        if (error || !data) return res.status(404).json({ error: 'Scan not found or access denied' });
        
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

const getScanPdf = async (req, res) => {
    try {
        if (!supabase) return res.status(500).json({ error: 'Database not configured' });

        // Permitimos el token por header Authorization o por query parameter ?token=...
        let token = null;
        if (req.headers.authorization) {
            token = req.headers.authorization.split(' ')[1];
        } else if (req.query.token) {
            token = req.query.token;
        }

        if (!token) return res.status(401).json({ error: 'Unauthorized: Missing token' });

        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) return res.status(401).json({ error: 'Unauthorized: Invalid token' });

        const { id } = req.params;
        
        // Verificar propiedad
        const { data: scanData, error: scanError } = await supabase
            .from('scans')
            .select('id, pdf_url')
            .eq('id', id)
            .eq('user_id', user.id)
            .single();

        if (scanError || !scanData || !scanData.pdf_url) {
            return res.status(404).json({ error: 'PDF not found or access denied' });
        }

        // Generar URL firmada válida por 60 segundos usando Service Role Key
        const fileName = `${id}.pdf`;
        const { data: signedData, error: signError } = await supabase.storage
            .from('reports')
            .createSignedUrl(fileName, 60);

        if (signError || !signedData) {
            return res.status(500).json({ error: 'Failed to generate secure URL for PDF' });
        }

        // Redirigir al cliente a la URL segura
        res.redirect(signedData.signedUrl);

    } catch (error) {
        console.error('Error fetching PDF:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

module.exports = { startScan, getScan, getScanPdf };
