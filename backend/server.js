require('dotenv').config();
const express = require('express');
const cors = require('cors');
const scanRoutes = require('./routes/scan.routes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api/scan', scanRoutes);

app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'Aegis CyberAudit API' });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
