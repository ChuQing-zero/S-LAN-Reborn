const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const Card = require('../../models/Card');
const Library = require('../../models/Library');

// POST /v1/api/libraries/transfer/upload - 上传到云端 (本地 -> 云端)
router.post('/upload', auth, async (req, res) => {
  try {
    const { fromCode, toCode, cardIds } = req.body;

    if (!fromCode || !toCode || !cardIds || !Array.isArray(cardIds)) {
      return res.status(400).json({ error: 'fromCode, toCode and cardIds are required' });
    }

    const fromLibrary = await Library.findOne({ code: fromCode, type: 'local', owner: req.user.id });
    const toLibrary = await Library.findOne({ code: toCode, type: 'cloud', owner: req.user.id });

    if (!fromLibrary) {
      return res.status(404).json({ error: 'Source library not found' });
    }
    if (!toLibrary) {
      return res.status(404).json({ error: 'Target library not found' });
    }

    const cards = await Card.find({ _id: { $in: cardIds }, libraryCode: fromCode });
    if (cards.length !== cardIds.length) {
      return res.status(404).json({ error: 'Some cards not found' });
    }

    const toCount = await Card.countDocuments({ libraryCode: toCode });
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
        img: original.img
      });
      await newCard.save();
      newCards.push(newCard);
    }

    await Card.deleteMany({ _id: { $in: cardIds } });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /v1/api/libraries/transfer/download - 下载到本地 (云端 -> 本地)
router.post('/download', auth, async (req, res) => {
  try {
    const { fromCode, toCode, cardIds } = req.body;

    if (!fromCode || !toCode || !cardIds || !Array.isArray(cardIds)) {
      return res.status(400).json({ error: 'fromCode, toCode and cardIds are required' });
    }

    const fromLibrary = await Library.findOne({ code: fromCode, type: 'cloud', owner: req.user.id });
    const toLibrary = await Library.findOne({ code: toCode, type: 'local', owner: req.user.id });

    if (!fromLibrary) {
      return res.status(404).json({ error: 'Source library not found' });
    }
    if (!toLibrary) {
      return res.status(404).json({ error: 'Target library not found' });
    }

    const cards = await Card.find({ _id: { $in: cardIds }, libraryCode: fromCode });
    if (cards.length !== cardIds.length) {
      return res.status(404).json({ error: 'Some cards not found' });
    }

    const toCount = await Card.countDocuments({ libraryCode: toCode });
    
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
        img: original.img
      });
      await newCard.save();
    }

    await Card.deleteMany({ _id: { $in: cardIds } });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
