const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const { VersionConfig, DEFAULT_RARITIES, DEFAULT_GRADES } = require('../../models/VersionConfig');

// GET /v1/api/rarities - 罕贵度列表
router.get('/rarities', auth, async (req, res) => {
  try {
    const { versionId } = req.query;
    
    let rarities = [...DEFAULT_RARITIES];
    let defaultRarity = DEFAULT_RARITIES[1] || null;

    // 如果指定了 versionId，尝试从数据库获取配置
    if (versionId) {
      const config = await VersionConfig.findOne({ versionId: parseInt(versionId) });
      if (config) {
        rarities = config.rarities;
        defaultRarity = config.defaultRarity || rarities[1] || null;
      }
    }

    res.json({ 
      list: rarities,
      default: defaultRarity
    });
  } catch (error) {
    console.error('Get rarities error:', error);
    // 出错时返回默认值
    res.json({ 
      list: DEFAULT_RARITIES,
      default: DEFAULT_RARITIES[1] || null
    });
  }
});

// GET /v1/api/grades - 品相列表
router.get('/grades', auth, async (req, res) => {
  try {
    const { versionId } = req.query;
    
    let grades = [...DEFAULT_GRADES];
    let defaultGrade = DEFAULT_GRADES[1]?.name || null;

    // 如果指定了 versionId，尝试从数据库获取配置
    if (versionId) {
      const config = await VersionConfig.findOne({ versionId: parseInt(versionId) });
      if (config) {
        grades = config.grades;
        defaultGrade = config.defaultGrade || grades[1]?.name || null;
      }
    }

    res.json({ 
      list: grades,
      default: defaultGrade
    });
  } catch (error) {
    console.error('Get grades error:', error);
    // 出错时返回默认值
    res.json({ 
      list: DEFAULT_GRADES,
      default: DEFAULT_GRADES[1]?.name || null
    });
  }
});

// GET /v1/api/grades/psa - 评级卡子选项
router.get('/grades/psa', auth, (req, res) => {
  const psaGrades = [
    'PSA 10', 'PSA 9', 'PSA 8', 'PSA 7', 'PSA 6',
    'PSA 5', 'PSA 4', 'PSA 3', 'PSA 2', 'PSA 1'
  ];
  res.json({ list: psaGrades });
});

module.exports = router;
