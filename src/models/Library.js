const mongoose = require('mongoose');

const librarySchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  type: { type: String, enum: ['local', 'cloud'], required: true },
  owner: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Library', librarySchema);
