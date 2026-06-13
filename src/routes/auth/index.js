const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const config = require('../../config');
const User = require('../../models/User');
const { generateToken, generateUserId } = require('../../utils/helpers');

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken(user.id);
    
    res.json({
      token,
      user: {
        id: user.id,
        nickname: user.nickname,
        email: user.email,
        avatar: user.avatar
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/register', async (req, res) => {
  try {
    const { nickname, email, password, inviteCode } = req.body;

    if (!nickname || !email || !password || !inviteCode) {
      return res.status(400).json({ error: 'nickname, email, password and inviteCode are required' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const InviteCode = require('../../models/InviteCode');
    const invite = await InviteCode.findOne({ code: inviteCode, used: false });
    if (!invite) {
      return res.status(409).json({ error: 'Invalid invite code' });
    }

    const userId = generateUserId();
    const user = new User({
      id: userId,
      nickname,
      email,
      password
    });
    await user.save();

    invite.used = true;
    invite.usedBy = userId;
    invite.usedAt = new Date();
    await invite.save();

    const token = generateToken(user.id);

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
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
