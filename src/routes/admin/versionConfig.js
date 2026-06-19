const express = require('express');
const router = express.Router();
const authAdmin = require('../../middleware/authAdmin');
const { VersionConfig, DEFAULT_RARITIES, DEFAULT_GRADES } = require('../../models/VersionConfig');

// 工具函数：格式化日期
const formatDate = (date) => {
  if (!date) return null;
  return new Date(date).toISOString();
};

// 工具函数：获取配置（如果不存在返回默认值）
const getConfigOrDefault = (config) => {
  if (!config) {
    return {
      rarities: DEFAULT_RARITIES,
      grades: DEFAULT_GRADES,
      defaultRarity: DEFAULT_RARITIES[1] || null,
      defaultGrade: DEFAULT_GRADES[1]?.name || null
    };
  }
  return {
    versionId: config.versionId,
    rarities: config.rarities,
    grades: config.grades,
    defaultRarity: config.defaultRarity,
    defaultGrade: config.defaultGrade,
    updatedAt: formatDate(config.updatedAt)
  };
};

// GET /v1/api/admin/version-config - 获取所有版本配置
router.get('/', authAdmin, async (req, res) => {
  try {
    const configs = await VersionConfig.find().sort({ versionId: 1 });
    const data = configs.map(config => getConfigOrDefault(config));
    res.json({ data });
  } catch (error) {
    console.error('Get all version configs error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /v1/api/admin/version-config/:versionId - 获取单个版本配置
router.get('/:versionId', authAdmin, async (req, res) => {
  try {
    const { versionId } = req.params;
    const config = await VersionConfig.findOne({ versionId: parseInt(versionId) });
    
    if (!config) {
      return res.status(404).json({ error: 'Version config not found' });
    }
    
    res.json(getConfigOrDefault(config));
  } catch (error) {
    console.error('Get version config error:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /v1/api/admin/version-config/:versionId - 创建/更新版本配置（upsert）
router.put('/:versionId', authAdmin, async (req, res) => {
  try {
    const { versionId } = req.params;
    const { rarities, grades, defaultRarity, defaultGrade } = req.body;
    const parsedVersionId = parseInt(versionId);

    // 校验：rarities 至少 1 项
    if (!rarities || !Array.isArray(rarities) || rarities.length === 0) {
      return res.status(400).json({ error: 'rarities must have at least 1 item' });
    }

    // 校验：defaultRarity 必须在 rarities 中
    if (defaultRarity && !rarities.includes(defaultRarity)) {
      return res.status(400).json({ error: 'defaultRarity must be in rarities list' });
    }

    // 校验：defaultGrade 必须在 grades[].name 中
    const gradeNames = grades.map(g => g.name);
    if (defaultGrade && !gradeNames.includes(defaultGrade)) {
      return res.status(400).json({ error: 'defaultGrade must be in grades list' });
    }

    // Upsert 操作
    const config = await VersionConfig.findOneAndUpdate(
      { versionId: parsedVersionId },
      {
        versionId: parsedVersionId,
        rarities,
        grades,
        defaultRarity: defaultRarity || rarities[0],
        defaultGrade: defaultGrade || grades[0]?.name || null
      },
      { upsert: true, new: true, runValidators: true }
    );

    res.json(getConfigOrDefault(config));
  } catch (error) {
    console.error('Update version config error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
