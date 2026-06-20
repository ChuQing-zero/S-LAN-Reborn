const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const Card = require('../../models/Card');
const Library = require('../../models/Library');

// POST /v1/api/libraries/transfer/upload - 上传到云端 (本地库 -> 云端库)
router.post('/upload', auth, async (req, res) => {
  try {
    const { fromCode, toCode, cardIds } = req.body;

    if (!fromCode || !toCode || !cardIds || !Array.isArray(cardIds)) {
      return res.status(400).json({ error: 'fromCode, toCode and cardIds are required' });
    }

    // 本地库属于当前用户，云端库属于所有人(userId=null)
    const fromLibrary = await Library.findOne({ code: fromCode, type: 'local', userId: req.user.id });
    const toLibrary = await Library.findOne({ code: toCode, type: 'cloud', userId: null });

    if (!fromLibrary) {
      return res.status(404).json({ error: 'Source library not found' });
    }
    if (!toLibrary) {
      return res.status(404).json({ error: 'Target library not found' });
    }

    // 从本地库获取卡牌（必须是当前用户的）
    const cards = await Card.find({ _id: { $in: cardIds }, libraryCode: fromCode, userId: req.user.id });
    if (cards.length !== cardIds.length) {
      return res.status(404).json({ error: 'Some cards not found' });
    }

    const toCount = await Card.countDocuments({ libraryCode: toCode, userId: null });
    const newCards = [];
    
    for (let i = 0; i < cards.length; i++) {
      const original = cards[i];
      const newSerial = `${toCode}-${String(toCount + i + 1).padStart(4, '0')}`;
      
      const newCard = new Card({
        jpName: original.jpName,
        cnName: original.cnName,
        code: original.code,
        rarity: original.rarity,
        condition: original.condition,
        serial: newSerial,
        libraryCode: toCode,
        versionId: original.versionId,
        img: original.img,
        userId: null  // 云端库卡牌 userId=null
      });
      await newCard.save();
      newCards.push(newCard);
    }

    // 从本地库删除卡牌
    await Card.deleteMany({ _id: { $in: cardIds } });

    res.json({ success: true, count: newCards.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /v1/api/libraries/transfer/download - 下载到本地 (云端库 -> 本地库)
router.post('/download', auth, async (req, res) => {
  try {
    const { fromCode, toCode, cardIds } = req.body;

    if (!fromCode || !toCode || !cardIds || !Array.isArray(cardIds)) {
      return res.status(400).json({ error: 'fromCode, toCode and cardIds are required' });
    }

    // 云端库属于所有人，本地库属于当前用户
    const fromLibrary = await Library.findOne({ code: fromCode, type: 'cloud', userId: null });
    const toLibrary = await Library.findOne({ code: toCode, type: 'local', userId: req.user.id });

    if (!fromLibrary) {
      return res.status(404).json({ error: 'Source library not found' });
    }
    if (!toLibrary) {
      return res.status(404).json({ error: 'Target library not found' });
    }

    // 从云端库获取卡牌
    const cards = await Card.find({ _id: { $in: cardIds }, libraryCode: fromCode, userId: null });
    if (cards.length !== cardIds.length) {
      return res.status(404).json({ error: 'Some cards not found' });
    }

    const toCount = await Card.countDocuments({ libraryCode: toCode, userId: req.user.id });
    
    for (let i = 0; i < cards.length; i++) {
      const original = cards[i];
      const newSerial = `${toCode}-${String(toCount + i + 1).padStart(4, '0')}`;
      
      const newCard = new Card({
        jpName: original.jpName,
        cnName: original.cnName,
        code: original.code,
        rarity: original.rarity,
        condition: original.condition,
        serial: newSerial,
        libraryCode: toCode,
        versionId: original.versionId,
        img: original.img,
        userId: req.user.id  // 本地库卡牌绑定当前用户
      });
      await newCard.save();
    }

    // 从云端库删除卡牌
    await Card.deleteMany({ _id: { $in: cardIds } });

    res.json({ success: true, count: cards.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
