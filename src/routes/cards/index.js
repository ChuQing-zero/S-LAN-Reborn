const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const Card = require('../../models/Card');
const Library = require('../../models/Library');

// GET /v1/api/cards/search - 搜索卡牌
router.get('/search', auth, async (req, res) => {
  try {
    const { q, libraryCode, type } = req.query;

    if (!q) {
      return res.status(400).json({ error: 'q is required' });
    }

    const query = {
      $or: [
        { jpName: { $regex: q, $options: 'i' } },
        { cnName: { $regex: q, $options: 'i' } },
        { code: { $regex: q, $options: 'i' } },
        { serial: { $regex: q, $options: 'i' } }
      ]
    };

    if (libraryCode) {
      query.libraryCode = libraryCode;
    }

    if (type) {
      const userIdFilter = type === 'cloud' ? null : req.user.id;
      const libraries = await Library.find({ type, userId: userIdFilter });
      const codes = libraries.map(lib => lib.code);
      query.libraryCode = { $in: codes };
      query.userId = userIdFilter;
    }

    const cards = await Card.find(query).limit(50);
    const list = cards.map(card => ({
      id: card._id,
      jpName: card.jpName,
      cnName: card.cnName,
      code: card.code,
      rarity: card.rarity,
      condition: card.condition,
      serial: card.serial,
      img: card.img,
      libraryCode: card.libraryCode,
      versionId: card.versionId
    }));

    res.json({ list });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /v1/api/cards - 创建卡牌
router.post('/', auth, async (req, res) => {
  try {
    const { libraryCode, jpName, cnName, code, rarity, condition, versionId, type = 'local' } = req.body;

    if (!libraryCode) {
      return res.status(400).json({ error: 'libraryCode is required' });
    }

    const userId = type === 'cloud' ? null : req.user.id;
    const library = await Library.findOne({ code: libraryCode, type, userId });
    if (!library) {
      return res.status(404).json({ error: 'Library not found' });
    }

    const count = await Card.countDocuments({ libraryCode, userId });
    const serial = `${libraryCode}-${String(count + 1).padStart(4, '0')}`;

    const card = new Card({
      jpName: jpName || '',
      cnName: cnName || '',
      code: code || '',
      rarity: rarity || '',
      condition: condition || '',
      serial,
      libraryCode,
      versionId: versionId || 1,
      img: '',
      userId
    });
    await card.save();

    res.status(201).json({
      id: card._id,
      serial: card.serial,
      img: card.img
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /v1/api/cards/:id - 删除卡牌
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const card = await Card.findOne({ _id: id, userId: req.user.id });
    if (!card) {
      return res.status(404).json({ error: 'Card not found' });
    }

    await Card.findByIdAndDelete(id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
