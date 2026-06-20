const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const Library = require('../../models/Library');
const Card = require('../../models/Card');
const Version = require('../../models/Version');
const { generateLibraryId } = require('../../utils/helpers');

// GET /v1/api/versions - 游戏版本列表
router.get('/versions', auth, async (req, res) => {
  try {
    // 尝试从数据库读取
    let versions = await Version.find().lean();
    
    // 如果数据库为空，返回默认数据
    if (!versions || versions.length === 0) {
      versions = [
        { id: 'default-1', name: '游戏王日文', lang: '日文', logo: '/static/icons/version_logos/logo_yugioh_jp.png' },
        { id: 'default-2', name: '游戏王简中', lang: '简中', logo: '/static/icons/version_logos/logo_yugioh_cn.png' },
        { id: 'default-3', name: '游戏王英文', lang: '英文', logo: '/static/icons/version_logos/logo_yugioh_en.png' },
        { id: 'default-4', name: '游戏王测试', lang: '测试', logo: '/static/icons/version_logos/logo_yugioh_test.png' },
        { id: 'default-5', name: '宝可梦日文', lang: '日文', logo: '/static/icons/version_logos/logo_pokemon_jp.png' },
        { id: 'default-6', name: '宝可梦简中', lang: '简中', logo: '/static/icons/version_logos/logo_pokemon_cn.png' },
        { id: 'default-7', name: '宝可梦英文', lang: '英文', logo: '/static/icons/version_logos/logo_pokemon_en.png' },
        { id: 'default-8', name: '宝可梦繁中', lang: '繁中', logo: '/static/icons/version_logos/logo_pokemon_tw.png' }
      ];
    }
    
    res.json({ list: versions });
  } catch (error) {
    console.error('Get versions error:', error);
    // 出错时返回默认数据
    const versions = [
      { name: '游戏王日文', lang: '日文', logo: '/static/icons/version_logos/logo_yugioh_jp.png' },
      { name: '游戏王简中', lang: '简中', logo: '/static/icons/version_logos/logo_yugioh_cn.png' }
    ];
    res.json({ list: versions });
  }
});

// GET /v1/api/libraries/local - 本地库列表
router.get('/libraries/local', auth, async (req, res) => {
  try {
    const libraries = await Library.find({ type: 'local', owner: req.user.id });
    const list = await Promise.all(libraries.map(async (lib) => {
      const cardCount = await Card.countDocuments({ libraryCode: lib.code });
      return { code: lib.code, cardCount };
    }));
    res.json({ list });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /v1/api/libraries/cloud - 云端库列表
router.get('/libraries/cloud', auth, async (req, res) => {
  try {
    const libraries = await Library.find({ type: 'cloud', owner: req.user.id });
    const list = await Promise.all(libraries.map(async (lib) => {
      const cardCount = await Card.countDocuments({ libraryCode: lib.code });
      return { code: lib.code, cardCount };
    }));
    res.json({ list });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /v1/api/libraries/:code - 库详情
router.get('/libraries/:code', auth, async (req, res) => {
  try {
    const { code } = req.params;
    const type = req.query.type || 'local';
    
    const library = await Library.findOne({ code, type, owner: req.user.id });
    if (!library) {
      return res.status(404).json({ error: 'Library not found' });
    }

    const cardCount = await Card.countDocuments({ libraryCode: code });
    res.json({
      code: library.code,
      id: library.id,
      name: library.name,
      type: library.type,
      cardCount
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /v1/api/libraries - 创建新库
router.post('/libraries', auth, async (req, res) => {
  try {
    const { type = 'local', name } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }

    const code = name;
    const existing = await Library.findOne({ code, owner: req.user.id });
    if (existing) {
      return res.status(409).json({ error: 'Library already exists' });
    }

    const libraryId = generateLibraryId(code);
    const library = new Library({
      code,
      id: libraryId,
      name,
      type,
      owner: req.user.id
    });
    await library.save();

    res.status(201).json({
      code: library.code,
      id: library.id,
      cardCount: 0
    });
  } catch (error) {
    // 处理 MongoDB 重复键错误 E11000
    if (error.code === 11000) {
      return res.status(409).json({ error: 'Library already exists' });
    }
    res.status(500).json({ error: error.message });
  }
});

// PUT /v1/api/libraries/:code - 更新库设置
router.put('/libraries/:code', auth, async (req, res) => {
  try {
    const { code } = req.params;
    const { name, type } = req.body;

    const library = await Library.findOne({ code, owner: req.user.id });
    if (!library) {
      return res.status(404).json({ error: 'Library not found' });
    }

    if (name) library.name = name;
    if (type) library.type = type;
    await library.save();

    const cardCount = await Card.countDocuments({ libraryCode: code });
    res.json({
      code: library.code,
      id: library.id,
      name: library.name,
      type: library.type,
      cardCount
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /v1/api/libraries/:code/cards - 库中卡牌列表
router.get('/libraries/:code/cards', auth, async (req, res) => {
  try {
    const { code } = req.params;
    const { type = 'local', rarity, condition, versionId, page = 1, pageSize = 20 } = req.query;

    const library = await Library.findOne({ code, type, owner: req.user.id });
    if (!library) {
      return res.json({ list: [], total: 0, page: 1, pageSize: 20 });
    }

    const query = { libraryCode: code };
    if (rarity) query.rarity = rarity;
    if (condition) query.condition = condition;
    if (versionId) query.versionId = parseInt(versionId);

    const total = await Card.countDocuments(query);
    const cards = await Card.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(parseInt(pageSize));

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

    res.json({
      list,
      total,
      page: parseInt(page),
      pageSize: parseInt(pageSize)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /v1/api/libraries/:code - 删除库
router.delete('/libraries/:code', auth, async (req, res) => {
  try {
    const { code } = req.params;
    const type = req.query.type || 'local';

    const library = await Library.findOne({ code, type, owner: req.user.id });
    if (!library) {
      return res.status(404).json({ error: 'Library not found' });
    }

    // 删除库中的所有卡牌
    await Card.deleteMany({ libraryCode: code });

    // 删除库
    await Library.deleteOne({ _id: library._id });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
