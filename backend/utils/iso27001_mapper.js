/**
 * Mapea una vulnerabilidad a un control ISO 27001
 */
const ISO27001_CONTROLS = {
    'open_port_http': 'A.13.1.1 (Network Controls)',
    'open_port_telnet': 'A.13.1.1 (Network Controls)',
    'missing_security_headers': 'A.14.2.5 (Secure System Engineering Principles)',
    'outdated_software': 'A.12.6.1 (Management of Technical Vulnerabilities)',
    'default': 'A.18.2.3 (Technical Compliance Review)'
};

function mapToControl(vulnType) {
    return ISO27001_CONTROLS[vulnType] || ISO27001_CONTROLS['default'];
}

module.exports = { mapToControl };
