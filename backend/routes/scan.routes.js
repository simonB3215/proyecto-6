const express = require('express');
const router = express.Router();
const { startScan, getScan, getScanPdf } = require('../controllers/scan.controller');

router.post('/', startScan);
router.get('/:id', getScan);
router.get('/:id/pdf', getScanPdf);

module.exports = router;
