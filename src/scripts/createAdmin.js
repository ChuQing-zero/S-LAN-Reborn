/**
 * 创建管理员账号
 * 运行: node src/scripts/createAdmin.js
 */

const mongoose = require('mongoose');
const config = require('../config');
const User = require('../models/User');
const { generateUserId } = require('../utils/helpers');

const ADMIN_EMAIL = 'admin@s-lan.com';
const ADMIN_PASSWORD = 'Admin@2026!';
const ADMIN_NICKNAME = '管理员';

async function createAdmin() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(config.mongodbUri);
    console.log('MongoDB connected successfully');

    // 检查是否已存在管理员
    const existingAdmin = await User.findOne({ email: ADMIN_EMAIL });
    
    if (existingAdmin) {
      console.log(`\n管理员账号已存在: ${ADMIN_EMAIL}`);
      
      // 如果已存在但不是管理员角色，更新为管理员
      if (existingAdmin.role !== 'admin') {
        existingAdmin.role = 'admin';
        await existingAdmin.save();
        console.log('已将现有用户更新为管理员角色');
      }
      
      console.log('\n管理员信息:');
      console.log(`  邮箱: ${existingAdmin.email}`);
      console.log(`  昵称: ${existingAdmin.nickname}`);
      console.log(`  角色: ${existingAdmin.role}`);
      console.log(`  ID: ${existingAdmin.id}`);
    } else {
      // 创建新管理员
      const userId = generateUserId();
      const admin = new User({
        id: userId,
        nickname: ADMIN_NICKNAME,
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        role: 'admin'
      });
      
      await admin.save();
      
      console.log('\n✅ 管理员账号创建成功!');
      console.log('\n管理员信息:');
      console.log(`  邮箱: ${ADMIN_EMAIL}`);
      console.log(`  密码: ${ADMIN_PASSWORD}`);
      console.log(`  昵称: ${ADMIN_NICKNAME}`);
      console.log(`  ID: ${userId}`);
    }

    console.log('\n' + '='.repeat(50));
    console.log('请使用以下凭据登录管理后台:');
    console.log(`  邮箱: ${ADMIN_EMAIL}`);
    console.log(`  密码: ${ADMIN_PASSWORD}`);
    console.log('='.repeat(50));

    process.exit(0);
  } catch (error) {
    console.error('\n❌ 创建管理员失败:', error.message);
    process.exit(1);
  }
}

createAdmin();
