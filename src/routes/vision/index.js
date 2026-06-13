const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');

// POST /v1/api/vision/recognize - 拍照识别卡牌
router.post('/recognize', auth, async (req, res) => {
  try {
    if (!req.files || !req.files.image) {
      return res.status(400).json({ error: 'image is required' });
    }

    const { versionId } = req.body;

    // TODO: 后续接入真实 OCR 模型
    // 目前返回模拟数据
    const mockResults = [
      { jpName: '閃刀姫－レイ', cnName: '闪刀姬-零', code: 'QCAC-JP059', rarity: 'QCSER', confidence: 0.95 },
      { jpName: '灰流うらら', cnName: '灰流丽', code: 'SAST-CN071', rarity: 'UR', confidence: 0.92 },
      { jpName: '黒魔导士', cnName: '黑魔导士', code: 'LOB-CN001', rarity: 'UR', confidence: 0.88 },
    ];

    const result = mockResults[Math.floor(Math.random() * mockResults.length)];

    res.json({
      jpName: result.jpName,
      cnName: result.cnName,
      code: result.code,
      rarity: result.rarity,
      confidence: result.confidence
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
