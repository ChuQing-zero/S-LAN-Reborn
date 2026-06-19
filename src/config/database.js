const mongoose = require('mongoose');
const config = require('./index');

const connectDB = async () => {
  try {
    // MongoDB 默认支持 UTF-8，无需额外配置
    // 连接字符串中的特殊字符已正确编码
    await mongoose.connect(config.mongodbUri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
