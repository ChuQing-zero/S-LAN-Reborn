const mongoose = require('mongoose');

const librarySchema = new mongoose.Schema({
  code: { type: String, required: true },
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['local', 'cloud'], required: true },
  owner: { type: String, required: true },
  userId: { type: String, default: null }  // 本地库=当前用户ID, 云端库=null
}, { timestamps: true });

// 复合唯一索引：code + owner 确保同一用户不会有重复库名
librarySchema.index({ code: 1, owner: 1 }, { unique: true });
librarySchema.index({ userId: 1 });
librarySchema.index({ type: 1, userId: 1 });

module.exports = mongoose.model('Library', librarySchema);
