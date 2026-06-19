const mongoose = require('mongoose');

const versionSchema = new mongoose.Schema({
  versionId: { 
    type: Number, 
    required: true, 
    unique: true 
  },
  name: { type: String, required: true },
  lang: { type: String, default: '' },
  logo: { type: String, default: '' }
}, { 
  timestamps: true,
  collection: 'versions'
});

module.exports = mongoose.model('Version', versionSchema);
