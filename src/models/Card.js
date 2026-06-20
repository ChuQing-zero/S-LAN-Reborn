const mongoose = require('mongoose');

const cardSchema = new mongoose.Schema({
  serial: { type: String, required: true, unique: true },
  jpName: { type: String, default: '' },
  cnName: { type: String, default: '' },
  code: { type: String, default: '' },
  rarity: { type: String, default: '' },
  condition: { type: String, default: '' },
  img: { type: String, default: '' },
  libraryCode: { type: String, required: true },
  versionId: { type: Number, default: 1 },
  userId: { type: String, default: null }  // 本地库卡牌=当前用户ID, 云端库卡牌=null
}, { timestamps: true });

cardSchema.index({ libraryCode: 1 });
cardSchema.index({ jpName: 'text', cnName: 'text', code: 'text', serial: 'text' });
cardSchema.index({ userId: 1 });
cardSchema.index({ libraryCode: 1, userId: 1 });

module.exports = mongoose.model('Card', cardSchema);
