const express = require('express');
const router = express.Router();
const { handleWebhook } = require('../controllers/webhookController');

// Ruta para verificar el webhook (GET)
router.get('/', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.VERIFY_TOKEN) {
    console.log('WEBHOOK_VERIFIED');
    return res.status(200).send(challenge);
  }
  
  res.sendStatus(403);
});

// Ruta para recibir actualizaciones de WhatsApp (POST)
router.post('/', handleWebhook);

module.exports = router;
