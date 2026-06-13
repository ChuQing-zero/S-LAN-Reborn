const express = require('express');
const jwt = require('jsonwebtoken');
const config = require('../../config');
const User = require('../../models/User');
const InviteCode = require('../../models/InviteCode');

const router = express.Router();

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// POST /v1/api/auth/register - 注册
router.post('/register', async (req, res) => {
  try {
    const { nickname, email, password, inviteCode } = req.body;

    if (!nickname || !email || !password || !inviteCode) {
      return res.status(400).json({ 
        error: 'nickname, email, password and inviteCode are required' 
      });
    }

    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const invite = await InviteCode.findOne({ 
      code: inviteCode.toUpperCase() 
    });
    
    if (!invite || invite.isUsed) {
      return res.status(409).json({ error: 'Invalid invite code' });
    }

    const userId = await User.generateId();

    const user = new User({
      id: userId,
      nickname,
      email: email.toLowerCase(),
      password
    });
    await user.save();

    invite.isUsed = true;
    invite.usedBy = user._id;
    invite.usedAt = new Date();
    await invite.save();

    const token = jwt.sign(
      { userId: user.id },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    res.status(201).json({
      token,
      user: {
        id: user.id,
        nickname: user.nickname,
        email: user.email,
        avatar: user.avatar
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
