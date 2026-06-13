const mongoose = require('mongoose');

const inviteCodeSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  used: { type: Boolean, default: false },
  usedBy: { type: String, default: null },
  usedAt: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model('InviteCode', inviteCodeSchema);
