const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');

router.get('/profile', auth, (req, res) => {
  res.json({
    id: req.user.id,
    nickname: req.user.nickname,
    email: req.user.email,
    avatar: req.user.avatar
  });
});

module.exports = router;
