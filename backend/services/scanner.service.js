const http = require('http');
const https = require('https');
const tls = require('tls');
const dns = require('dns').promises;

/**
 * Escanea de forma nativa en Node.js sin depender de Nmap
 */
async function performScan(targetUrl) {
    console.log(`Iniciando Aegis Audit en objetivo: ${targetUrl}`);
    const vulnerabilities = [];
    
    try {
        let urlObj;
        try {
            urlObj = new URL(targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`);
        } catch (e) {
            throw new Error('URL inválida');
        }

        const hostname = urlObj.hostname;

        // 1. CHEQUEO DNS (Búsqueda de registros para detectar configuraciones flojas)
        try {
            const records = await dns.resolveAny(hostname);
            const hasTXT = records.some(r => r.type === 'TXT');
            if (!hasTXT) {
                vulnerabilities.push({
                    title: 'Falta de Registros TXT (SPF/DMARC)',
                    description: 'No se encontraron registros TXT. El dominio podría ser vulnerable a email spoofing.',
                    severity: 'low',
                    type: 'missing_dns_sec'
                });
            }
        } catch (e) {
            console.log("Error DNS:", e.message);
        }

        // 2. CHEQUEO DE CERTIFICADO SSL
        if (urlObj.protocol === 'https:') {
            try {
                const certInfo = await new Promise((resolve, reject) => {
                    const socket = tls.connect({
                        host: hostname,
                        port: 443,
                        servername: hostname,
                        rejectUnauthorized: false // Para poder leer el cert aunque sea inválido
                    }, () => {
                        const cert = socket.getPeerCertificate(true);
                        socket.end();
                        resolve({
                            valid: socket.authorized,
                            cert: cert
                        });
                    });
                    socket.on('error', reject);
                });

                if (!certInfo.valid) {
                    vulnerabilities.push({
                        title: 'Certificado SSL Inválido o Autocertificado',
                        description: 'El certificado presentado por el servidor no es de confianza.',
                        severity: 'high',
                        type: 'ssl_invalid'
                    });
                } else {
                    // Chequeo de expiración próxima (menos de 15 días)
                    const validTo = new Date(certInfo.cert.valid_to);
                    const daysLeft = (validTo - new Date()) / (1000 * 60 * 60 * 24);
                    if (daysLeft < 15) {
                        vulnerabilities.push({
                            title: 'Certificado SSL próximo a expirar',
                            description: `El certificado SSL expirará en ${Math.round(daysLeft)} días.`,
                            severity: 'medium',
                            type: 'ssl_expiring'
                        });
                    }
                }
            } catch (e) {
                console.log("Error SSL:", e.message);
            }
        } else {
            vulnerabilities.push({
                title: 'Uso de Protocolo Inseguro (HTTP)',
                description: 'El protocolo HTTP no cifra el tráfico.',
                severity: 'high',
                type: 'open_port_http'
            });
        }

        // 3. CHEQUEO DE CABECERAS Y EXPOSICIÓN DE INFORMACIÓN
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

        if (headers['x-powered-by']) {
            vulnerabilities.push({
                title: 'Exposición de Tecnología (X-Powered-By)',
                description: `El servidor revela su tecnología backend: ${headers['x-powered-by']}.`,
                severity: 'medium',
                type: 'tech_exposure'
            });
        }
        
        if (headers['server']) {
            vulnerabilities.push({
                title: 'Exposición de Versión del Servidor',
                description: `El servidor revela su versión: ${headers['server']}.`,
                severity: 'low',
                type: 'tech_exposure'
            });
        }

        if (!headers['strict-transport-security'] && urlObj.protocol === 'https:') {
            vulnerabilities.push({
                title: 'Falta Cabecera HSTS',
                description: 'HTTP Strict Transport Security no está configurado.',
                severity: 'medium',
                type: 'missing_security_headers'
            });
        }
        
        if (!headers['x-frame-options']) {
            vulnerabilities.push({
                title: 'Falta Cabecera X-Frame-Options',
                description: 'Protección contra Clickjacking ausente.',
                severity: 'low',
                type: 'missing_security_headers'
            });
        }
        
        if (!headers['content-security-policy']) {
            vulnerabilities.push({
                title: 'Falta Content-Security-Policy',
                description: 'CSP no está configurado, facilitando XSS.',
                severity: 'medium',
                type: 'missing_security_headers'
            });
        }
        
    } catch (error) {
        console.error('Error al escanear el objetivo:', error.message);
        vulnerabilities.push({
            title: 'Objetivo Inalcanzable',
            description: `No se pudo escanear el objetivo: ${error.message}`,
            severity: 'critical',
            type: 'default'
        });
    }

    return vulnerabilities;
}

module.exports = { performScan };
