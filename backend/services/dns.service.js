const dns = require('dns').promises;

/**
 * Verifica si un dominio tiene el registro TXT esperado
 * @param {string} domain El dominio a verificar (ej. example.com)
 * @param {string} expectedToken El token que debería estar en el registro TXT (ej. aegis-verify=1234)
 * @returns {Promise<boolean>}
 */
async function verifyDomainOwnership(domain, expectedToken) {
    try {
        // Asegurarse de extraer solo el dominio si pasaron una URL
        let hostname = domain;
        if (domain.startsWith('http://') || domain.startsWith('https://')) {
            hostname = new URL(domain).hostname;
        }

        const records = await dns.resolveTxt(hostname);
        
        // dns.resolveTxt devuelve un array de arrays: [ [ 'v=spf1 ...' ], [ 'aegis-verify=1234' ] ]
        const txtStrings = records.map(recordArray => recordArray.join(''));
        
        return txtStrings.includes(expectedToken);
    } catch (error) {
        if (error.code === 'ENODATA' || error.code === 'ENOTFOUND') {
            return false; // No hay registros TXT
        }
        console.error(`Error verificando DNS para ${domain}:`, error.message);
        return false;
    }
}

module.exports = {
    verifyDomainOwnership
};
