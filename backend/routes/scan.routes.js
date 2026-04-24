const express = require('express');
const router = express.Router();
const { startScan, getScan } = require('../controllers/scan.controller');

router.post('/', startScan);
router.get('/:id', getScan);

module.exports = router;
