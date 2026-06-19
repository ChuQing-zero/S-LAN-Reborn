const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const authAdmin = require('../../middleware/authAdmin');
const Version = require('../../models/Version');
const Card = require('../../models/Card');

// 确保上传目录存在
const uploadsDir = path.join(__dirname, '../../../uploads/versions');
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
    const versionId = req.params.versionId || 'new';
    cb(null, `version-${versionId}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
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

// 获取所有版本
router.get('/', authAdmin, async (req, res) => {
  try {
    const versions = await Version.find().sort({ versionId: 1 });
    res.json({ list: versions });
  } catch (error) {
    console.error('Get versions error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 获取单个版本 (使用 versionId 字段)
router.get('/:versionId', authAdmin, async (req, res) => {
  try {
    const { versionId } = req.params;
    const version = await Version.findOne({ versionId: parseInt(versionId) });
    if (!version) {
      return res.status(404).json({ error: 'Version not found' });
    }
    res.json(version);
  } catch (error) {
    console.error('Get version error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 新增版本
router.post('/', authAdmin, async (req, res) => {
  try {
    const { name, lang } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }

    // 获取当前最大 versionId
    const lastVersion = await Version.findOne().sort({ versionId: -1 });
    const newVersionId = (lastVersion?.versionId || 0) + 1;

    const version = new Version({
      versionId: newVersionId,
      name,
      lang: lang || '',
      logo: ''
    });
    await version.save();

    res.status(201).json(version);
  } catch (error) {
    console.error('Create version error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 更新版本信息
router.put('/:versionId', authAdmin, async (req, res) => {
  try {
    const { versionId } = req.params;
    const { name, lang, logo } = req.body;

    const version = await Version.findOne({ versionId: parseInt(versionId) });
    if (!version) {
      return res.status(404).json({ error: 'Version not found' });
    }

    if (name) version.name = name;
    if (lang !== undefined) version.lang = lang;
    if (logo !== undefined) version.logo = logo;
    
    await version.save();
    res.json(version);
  } catch (error) {
    console.error('Update version error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 删除版本
router.delete('/:versionId', authAdmin, async (req, res) => {
  try {
    const { versionId } = req.params;

    const version = await Version.findOne({ versionId: parseInt(versionId) });
    if (!version) {
      return res.status(404).json({ error: 'Version not found' });
    }

    // 检查是否有关联数据（卡牌）
    const cardCount = await Card.countDocuments({ versionId: version.versionId });
    if (cardCount > 0) {
      return res.status(409).json({ 
        error: 'Cannot delete version with associated cards',
        cardCount 
      });
    }

    // 删除版本
    await Version.deleteOne({ versionId: parseInt(versionId) });
    res.json({ success: true });
  } catch (error) {
    console.error('Delete version error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 上传版本 Logo
router.post('/:versionId/logo', authAdmin, upload.single('image'), async (req, res) => {
  try {
    const { versionId } = req.params;

    const version = await Version.findOne({ versionId: parseInt(versionId) });
    if (!version) {
      // 删除已上传的文件
      if (req.file) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({ error: 'Version not found' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    // 更新 logo 路径
    const logoUrl = `/uploads/versions/${req.file.filename}`;
    version.logo = logoUrl;
    await version.save();

    res.json({ logoUrl });
  } catch (error) {
    console.error('Upload version logo error:', error);
    // 删除已上传的文件
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
