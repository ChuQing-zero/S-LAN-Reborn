const mongoose = require('mongoose');

const cardInfoSchema = new mongoose.Schema({
  cardCode: { 
    type: String, 
    required: true, 
    unique: true 
  },
  versionId: { 
    type: Number, 
    required: true 
  },
  jpName: { 
    type: String, 
    default: '' 
  },
  cnName: { 
    type: String, 
    default: '' 
  },
  imageUrl: { 
    type: String, 
    default: '' 
  },
  rarity: { 
    type: String, 
    default: '' 
  }
}, { timestamps: true });

// 索引
cardInfoSchema.index({ versionId: 1 });
cardInfoSchema.index({ cardCode: 1 });
cardInfoSchema.index({ jpName: 'text', cnName: 'text' });

module.exports = mongoose.model('CardInfo', cardInfoSchema);
