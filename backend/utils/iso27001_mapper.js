/**
 * Mapea una vulnerabilidad a un control ISO 27001
 */
const ISO27001_CONTROLS = {
    'open_port_http': 'A.13.1.1 (Network Controls)',
    'missing_security_headers': 'A.14.2.5 (Secure System Engineering Principles)',
    'ssl_invalid': 'A.10.1.1 (Policy on the use of cryptographic controls)',
    'ssl_expiring': 'A.10.1.2 (Key Management)',
    'missing_dns_sec': 'A.13.1.2 (Security of Network Services)',
    'tech_exposure': 'A.14.2.1 (Secure Development Policy)',
    'default': 'A.18.2.3 (Technical Compliance Review)'
};

function mapToControl(vulnType) {
    return ISO27001_CONTROLS[vulnType] || ISO27001_CONTROLS['default'];
}

module.exports = { mapToControl };
