const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const auth = require('../../middleware/auth');
const authAdmin = require('../../middleware/authAdmin');
const CardInfo = require('../../models/CardInfo');

// 确保上传目录存在
const uploadsDir = path.join(__dirname, '../../../uploads/cards');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// 配置 multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const cardCode = req.params.cardCode || 'unknown';
    // 替换特殊字符
    const safeCardCode = cardCode.replace(/[^a-zA-Z0-9]/g, '_');
    cb(null, `${safeCardCode}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /png|jpg|jpeg|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only images (png/jpg/webp) are allowed'));
  }
});

// ========================
// 普通用户接口
// ========================

// GET /v1/api/card-info/:cardCode - 根据编号查询卡牌信息
router.get('/:cardCode', auth, async (req, res) => {
  try {
    const { cardCode } = req.params;
    const cardInfo = await CardInfo.findOne({ cardCode });

    if (!cardInfo) {
      // 未收录，返回空数据
      return res.json({
        cardCode,
        versionId: null,
        jpName: null,
        cnName: null,
        imageUrl: null,
        rarity: null
      });
    }

    res.json({
      cardCode: cardInfo.cardCode,
      versionId: cardInfo.versionId,
      jpName: cardInfo.jpName,
      cnName: cardInfo.cnName,
      imageUrl: cardInfo.imageUrl,
      rarity: cardInfo.rarity
    });
  } catch (error) {
    console.error('Get card info error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /v1/api/card-info/batch - 批量查询
router.post('/batch', auth, async (req, res) => {
  try {
    const { cardCodes } = req.body;

    if (!cardCodes || !Array.isArray(cardCodes)) {
      return res.status(400).json({ error: 'cardCodes must be an array' });
    }

    // 限制最多 100 条
    const codes = cardCodes.slice(0, 100);
    const cardInfos = await CardInfo.find({ cardCode: { $in: codes } });
    
    // 转换为对象方便查找
    const infoMap = {};
    cardInfos.forEach(info => {
      infoMap[info.cardCode] = info;
    });

    // 按原始顺序返回
    const data = codes.map(code => {
      const info = infoMap[code];
      if (!info) {
        return {
          cardCode: code,
          versionId: null,
          jpName: null,
          cnName: null,
          imageUrl: null,
          rarity: null
        };
      }
      return {
        cardCode: info.cardCode,
        versionId: info.versionId,
        jpName: info.jpName,
        cnName: info.cnName,
        imageUrl: info.imageUrl,
        rarity: info.rarity
      };
    });

    res.json({ data });
  } catch (error) {
    console.error('Batch query card info error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ========================
// 管理员接口
// ========================

// GET /v1/api/card-info - 分页列表（管理员）
router.get('/', authAdmin, async (req, res) => {
  try {
    const { versionId, search, page = 1, pageSize = 50 } = req.query;
    
    const query = {};
    
    if (versionId) {
      query.versionId = parseInt(versionId);
    }
    
    if (search) {
      query.$or = [
        { cardCode: { $regex: search, $options: 'i' } },
        { jpName: { $regex: search, $options: 'i' } },
        { cnName: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(pageSize);
    const [cardInfos, total] = await Promise.all([
      CardInfo.find(query).skip(skip).limit(parseInt(pageSize)).sort({ createdAt: -1 }),
      CardInfo.countDocuments(query)
    ]);

    res.json({
      data: cardInfos,
      total,
      page: parseInt(page),
      pageSize: parseInt(pageSize)
    });
  } catch (error) {
    console.error('Get card info list error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /v1/api/card-info - 新增卡牌信息（管理员）
router.post('/', authAdmin, async (req, res) => {
  try {
    const { cardCode, versionId, jpName, cnName, rarity } = req.body;

    if (!cardCode || versionId === undefined) {
      return res.status(400).json({ error: 'cardCode and versionId are required' });
    }

    // 检查是否已存在
    const existing = await CardInfo.findOne({ cardCode });
    if (existing) {
      return res.status(409).json({ error: 'Card code already exists' });
    }

    const cardInfo = new CardInfo({
      cardCode,
      versionId,
      jpName: jpName || '',
      cnName: cnName || '',
      rarity: rarity || ''
    });
    await cardInfo.save();

    res.status(201).json(cardInfo);
  } catch (error) {
    console.error('Create card info error:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /v1/api/card-info/:cardCode - 更新卡牌信息（管理员）
router.put('/:cardCode', authAdmin, async (req, res) => {
  try {
    const { cardCode } = req.params;
    const { jpName, cnName, versionId, rarity } = req.body;

    const cardInfo = await CardInfo.findOne({ cardCode });
    if (!cardInfo) {
      return res.status(404).json({ error: 'Card info not found' });
    }

    // 更新字段
    if (jpName !== undefined) cardInfo.jpName = jpName;
    if (cnName !== undefined) cardInfo.cnName = cnName;
    if (versionId !== undefined) cardInfo.versionId = versionId;
    if (rarity !== undefined) cardInfo.rarity = rarity;

    await cardInfo.save();
    res.json(cardInfo);
  } catch (error) {
    console.error('Update card info error:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /v1/api/card-info/:cardCode - 删除卡牌信息（管理员）
router.delete('/:cardCode', authAdmin, async (req, res) => {
  try {
    const { cardCode } = req.params;
    
    const result = await CardInfo.findOneAndDelete({ cardCode });
    if (!result) {
      return res.status(404).json({ error: 'Card info not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete card info error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /v1/api/card-info/:cardCode/image - 上传卡牌图片（管理员）
router.post('/:cardCode/image', authAdmin, upload.single('image'), async (req, res) => {
  try {
    const { cardCode } = req.params;

    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const cardInfo = await CardInfo.findOne({ cardCode });
    if (!cardInfo) {
      // 删除已上传的文件
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'Card info not found' });
    }

    // 更新图片 URL
    const imageUrl = `/uploads/cards/${req.file.filename}`;
    cardInfo.imageUrl = imageUrl;
    await cardInfo.save();

    res.json({ imageUrl });
  } catch (error) {
    console.error('Upload card image error:', error);
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: error.message });
  }
});

// POST /v1/api/card-info/batch-import - CSV 批量导入（管理员）
router.post('/batch-import', authAdmin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const { versionId } = req.body;
    if (!versionId) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'versionId is required' });
    }

    // 读取 CSV 文件
    const csvContent = req.file.buffer.toString('utf-8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    
    // 跳过表头
    const dataLines = lines.slice(1);
    const total = dataLines.length;
    let success = 0;
    const errors = [];

    for (let i = 0; i < dataLines.length; i++) {
      const line = dataLines[i];
      const parts = line.split(',').map(p => p.trim().replace(/^"|"$/g, ''));

      if (parts.length < 3) {
        errors.push({
          row: i + 2, // +2 因为跳过了表头且从1开始
          cardCode: parts[0] || '',
          reason: '数据不完整，至少需要 cardCode, jpName, cnName'
        });
        continue;
      }

      const [cardCode, jpName, cnName, rarity] = parts;

      // 校验 cardCode
      if (!cardCode) {
        errors.push({
          row: i + 2,
          cardCode: '',
          reason: 'cardCode 为空'
        });
        continue;
      }

      try {
        // Upsert 操作
        await CardInfo.findOneAndUpdate(
          { cardCode },
          {
            cardCode,
            versionId: parseInt(versionId),
            jpName: jpName || '',
            cnName: cnName || '',
            rarity: rarity || ''
          },
          { upsert: true, new: true }
        );
        success++;
      } catch (err) {
        errors.push({
          row: i + 2,
          cardCode,
          reason: err.message
        });
      }
    }

    // 删除临时文件
    fs.unlinkSync(req.file.path);

    res.json({
      total,
      success,
      failed: errors.length,
      errors: errors.slice(0, 20) // 最多返回20条错误
    });
  } catch (error) {
    console.error('CSV import error:', error);
    if (req.file && req.file.path) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
