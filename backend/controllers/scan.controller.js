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

        // 1.5 Validar Propiedad del Dominio (Anti-Abuso)
        const dnsService = require('../services/dns.service');
        const expectedToken = `aegis-verify=${user.id}`;
        const isVerified = await dnsService.verifyDomainOwnership(targetData.url, expectedToken);

        if (!isVerified) {
            return res.status(403).json({ 
                error: 'Domain not verified',
                message: `Please add a TXT record to your domain with the value: ${expectedToken}` 
            });
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

        // 3. Ejecutar el Escaneo (Encolar en BullMQ)
        const { scanQueue } = require('../workers/scanQueue');
        await scanQueue.add('process-scan', {
            scanData: scanData,
            targetData: targetData
        });

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

        // Descargar el archivo directamente desde Supabase Storage
        const fileName = `${id}.pdf`;
        const { data: fileData, error: downloadError } = await supabase.storage
            .from('reports')
            .download(fileName);

        if (downloadError || !fileData) {
            return res.status(500).json({ error: 'Failed to download PDF from storage' });
        }

        // Convertir el Blob de Supabase a un Buffer para enviarlo por Express
        const arrayBuffer = await fileData.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Enviar el PDF directamente como un flujo binario
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="Reporte_Auditoria_${id}.pdf"`);
        res.send(buffer);

    } catch (error) {
        console.error('Error fetching PDF:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

module.exports = { startScan, getScan, getScanPdf };
