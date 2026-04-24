const http = require('http');
const https = require('https');

/**
 * Escanea cabeceras HTTP en busca de vulnerabilidades comunes.
 * Para un MVP, esto demuestra una auditoría real sin requerir dependencias externas del SO (como nmap).
 */
async function performScan(targetUrl) {
    console.log(`Iniciando escaneo en objetivo: ${targetUrl}`);
    const vulnerabilities = [];
    
    try {
        let urlObj;
        try {
            urlObj = new URL(targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`);
        } catch (e) {
            throw new Error('URL inválida');
        }

        const client = urlObj.protocol === 'https:' ? https : http;
        
        const headers = await new Promise((resolve, reject) => {
            const req = client.get(urlObj.href, (res) => {
                resolve(res.headers);
            });
            req.on('error', (e) => reject(e));
            req.setTimeout(5000, () => {
                req.destroy();
                reject(new Error('Timeout de conexión'));
            });
        });

        // 1. Missing HSTS
        if (!headers['strict-transport-security'] && urlObj.protocol === 'https:') {
            vulnerabilities.push({
                title: 'Falta Cabecera HSTS',
                description: 'HTTP Strict Transport Security no está configurado, permitiendo ataques de degradación de protocolo.',
                severity: 'medium',
                type: 'missing_security_headers'
            });
        }
        
        // 2. Missing X-Frame-Options
        if (!headers['x-frame-options']) {
            vulnerabilities.push({
                title: 'Falta Cabecera X-Frame-Options',
                description: 'La protección contra Clickjacking está ausente.',
                severity: 'low',
                type: 'missing_security_headers'
            });
        }
        
        // 3. Missing Content-Security-Policy
        if (!headers['content-security-policy']) {
            vulnerabilities.push({
                title: 'Falta Content-Security-Policy',
                description: 'CSP no está configurado, lo cual es vital para mitigar ataques XSS.',
                severity: 'medium',
                type: 'missing_security_headers'
            });
        }

        // Si es HTTP puro
        if (urlObj.protocol === 'http:') {
            vulnerabilities.push({
                title: 'Uso de Protocolo Inseguro (HTTP)',
                description: 'El puerto 80 (HTTP) está abierto y no cifra el tráfico.',
                severity: 'high',
                type: 'open_port_http'
            });
        }
        
    } catch (error) {
        console.error('Error al escanear el objetivo:', error.message);
        vulnerabilities.push({
            title: 'Objetivo Inalcanzable o Error de Conexión',
            description: `No se pudo escanear el objetivo: ${error.message}`,
            severity: 'critical',
            type: 'default'
        });
    }

    return vulnerabilities;
}

module.exports = { performScan };
