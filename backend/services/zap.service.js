// zap.service.js
const ZAP_API_URL = process.env.ZAP_API_URL || 'http://localhost:8080';
const ZAP_API_KEY = process.env.ZAP_API_KEY || ''; // Si ZAP está configurado con api key

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchZap(endpoint, params = {}) {
    const url = new URL(`${ZAP_API_URL}${endpoint}`);
    if (ZAP_API_KEY) {
        url.searchParams.append('apikey', ZAP_API_KEY);
    }
    for (const [key, value] of Object.entries(params)) {
        url.searchParams.append(key, value);
    }

    try {
        const response = await fetch(url.toString());
        if (!response.ok) {
            throw new Error(`ZAP API error: ${response.status} ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Error calling ZAP API ${endpoint}:`, error.message);
        throw error;
    }
}

async function performZapScan(targetUrl) {
    console.log(`[ZAP] Iniciando escaneo para: ${targetUrl}`);

    try {
        // 1. Iniciar Spider
        console.log('[ZAP] Lanzando Spider...');
        const spiderData = await fetchZap('/JSON/spider/action/scan/', { url: targetUrl });
        const spiderScanId = spiderData.scan;

        // Esperar a que el Spider termine
        let spiderStatus = 0;
        while (spiderStatus < 100) {
            await delay(2000);
            const statusData = await fetchZap('/JSON/spider/view/status/', { scanId: spiderScanId });
            spiderStatus = parseInt(statusData.status, 10);
            console.log(`[ZAP] Spider status: ${spiderStatus}%`);
        }

        // 2. Iniciar Active Scan (DAST)
        console.log('[ZAP] Lanzando Active Scan...');
        const ascanData = await fetchZap('/JSON/ascan/action/scan/', { url: targetUrl });
        const ascanId = ascanData.scan;

        // Esperar a que el Active Scan termine
        let ascanStatus = 0;
        while (ascanStatus < 100) {
            await delay(5000);
            const statusData = await fetchZap('/JSON/ascan/view/status/', { scanId: ascanId });
            ascanStatus = parseInt(statusData.status, 10);
            console.log(`[ZAP] Active Scan status: ${ascanStatus}%`);
        }

        // 3. Obtener alertas (Vulnerabilidades)
        console.log('[ZAP] Obteniendo alertas...');
        const alertsData = await fetchZap('/JSON/core/view/alerts/', { baseurl: targetUrl });
        
        // Transformar las alertas al formato esperado por el sistema
        const rawAlerts = alertsData.alerts || [];
        const vulnerabilities = rawAlerts.map(alert => ({
            title: `[ZAP] ${alert.alert}`,
            description: alert.description + (alert.solution ? `\n\nResolución: ${alert.solution}` : ''),
            severity: mapZapRiskToSeverity(alert.risk),
            type: alert.cweid ? `CWE-${alert.cweid}` : 'Web'
        }));

        console.log(`[ZAP] Escaneo completado. Encontradas ${vulnerabilities.length} vulnerabilidades.`);
        return vulnerabilities;

    } catch (error) {
        console.error('[ZAP] Falló el escaneo:', error);
        // Retornar array vacío para no quebrar el flujo completo si ZAP falla
        return [];
    }
}

function mapZapRiskToSeverity(riskStr) {
    const riskMap = {
        'Informational': 'Low',
        'Low': 'Low',
        'Medium': 'Medium',
        'High': 'High',
        'Critical': 'Critical'
    };
    return riskMap[riskStr] || 'Low';
}

module.exports = {
    performZapScan
};
