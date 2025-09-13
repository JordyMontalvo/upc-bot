const express = require('express');
const router = express.Router();
const { verifyWebhook, handleWebhook } = require('../controllers/webhookController');

// Ruta para verificar el webhook (GET)
router.get('/', verifyWebhook);

// Ruta para recibir actualizaciones de WhatsApp (POST)
router.post('/', handleWebhook);

module.exports = router;
