const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');

// GET /v1/api/rarities - 罕贵度列表
router.get('/rarities', auth, (req, res) => {
  const rarities = [
    '20SER', 'QCSER', 'PSER', 'HR', 'HPR', 'ESR', 'ESPR', 'SER',
    'SEMR', 'SEPR', 'PR', 'UPR', 'PGR', 'GSER', 'GMR', 'GR',
    'UTR', 'CR', 'UR', 'RR', 'USR', 'UMR', 'SR', 'SPR',
    'NPR', 'NMR', 'NKC', 'R', 'RKC', 'RPR', 'N', 'NR'
  ];
  res.json({ list: rarities });
});

// GET /v1/api/grades - 品相列表
router.get('/grades', auth, (req, res) => {
  const grades = [
    { name: '99品', desc: '完美全新', hasSub: false },
    { name: '9品', desc: '近新优品', hasSub: false },
    { name: '78品', desc: '标准流通', hasSub: false },
    { name: '56品', desc: '中小瑕疵', hasSub: false },
    { name: '34品', desc: '重大次品', hasSub: false },
    { name: '评级卡', desc: '', hasSub: true },
    { name: '自定义', desc: '', hasSub: true }
  ];
  res.json({ list: grades });
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
