const mongoose = require('mongoose');

const gradeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  desc: { type: String, default: '' },
  hasSub: { type: Boolean, default: false }
}, { _id: false });

const versionConfigSchema = new mongoose.Schema({
  versionId: { 
    type: Number, 
    required: true, 
    unique: true 
  },
  rarities: [{ type: String }],
  grades: [gradeSchema],
  defaultRarity: { type: String, default: null },
  defaultGrade: { type: String, default: null }
}, { 
  timestamps: true,
  collection: 'version_configs'
});

// Default rarities
const DEFAULT_RARITIES = [
  '20SER', 'QCSER', 'PSER', 'HR', 'HPR', 'ESR', 'ESPR', 'SER',
  'SEMR', 'SEPR', 'PR', 'UPR', 'PGR', 'GSER', 'GMR', 'GR',
  'UTR', 'CR', 'UR', 'RR', 'USR', 'UMR', 'SR', 'SPR',
  'NPR', 'NMR', 'NKC', 'R', 'RKC', 'RPR', 'N', 'NR'
];

// Default grades
const DEFAULT_GRADES = [
  { name: '99品', desc: '完美全新', hasSub: false },
  { name: '9品', desc: '近新优品', hasSub: false },
  { name: '78品', desc: '标准流通', hasSub: false },
  { name: '56品', desc: '中小瑕疵', hasSub: false },
  { name: '34品', desc: '重大次品', hasSub: false },
  { name: '评级卡', desc: '', hasSub: true },
  { name: '自定义', desc: '', hasSub: false }
];

module.exports = {
  VersionConfig: mongoose.model('VersionConfig', versionConfigSchema),
  DEFAULT_RARITIES,
  DEFAULT_GRADES
};
