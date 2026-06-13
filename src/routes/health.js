const express = require('express');
const router = express.Router();

// GET /health - 健康检查
router.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

module.exports = router;
