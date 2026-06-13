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
  versionId: { type: Number, default: 1 }
}, { timestamps: true });

cardSchema.index({ libraryCode: 1 });
cardSchema.index({ jpName: 'text', cnName: 'text', code: 'text', serial: 'text' });

module.exports = mongoose.model('Card', cardSchema);
