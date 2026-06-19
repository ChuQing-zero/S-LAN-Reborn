const mongoose = require('mongoose');

// MongoDB 连接
const MONGODB_URI = 'mongodb://root:8lY9LH7159Ah26sd@s-lan-relorn-db-mongodb.ns-3mbo57k2.svc:27017';

async function fixGarbledData() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const db = mongoose.connection.db;

  // 1. 修复 versions 集合中的乱码数据
  console.log('\n=== 修复 versions 集合 ===');
  const versions = await db.collection('versions').find({}).toArray();
  
  for (const version of versions) {
    // 检测是否有乱码（包含非法UTF-8字符）
    const hasGarbled = version.name?.includes('��') || version.lang?.includes('��');
    
    if (hasGarbled) {
      console.log(`修复 versionId ${version.versionId}: ${version.name} -> 宝可梦繁中`);
      await db.collection('versions').updateOne(
        { _id: version._id },
        { $set: { name: '宝可梦繁中', lang: '繁中' } }
      );
    }
  }

  // 2. 修复 version_configs 集合中的乱码数据
  console.log('\n=== 修复 version_configs 集合 ===');
  const configs = await db.collection('version_configs').find({}).toArray();
  
  for (const config of configs) {
    let needsFix = false;
    let newGrades = [...config.grades];
    
    // 检查 grades 中的乱码
    for (let i = 0; i < newGrades.length; i++) {
      if (newGrades[i].name?.includes('��') || newGrades[i].desc?.includes('��')) {
        needsFix = true;
        // 根据乱码模式判断应该是哪个值
        if (newGrades[i].name?.includes('9Ʒ')) {
          newGrades[i] = { name: '9品', desc: '近新优品', hasSub: newGrades[i].hasSub || false };
        }
      }
    }
    
    if (needsFix) {
      console.log(`修复 versionId ${config.versionId} 的 grades`);
      await db.collection('version_configs').updateOne(
        { _id: config._id },
        { $set: { grades: newGrades } }
      );
    }
  }

  console.log('\n=== 修复完成 ===');
  
  // 验证
  console.log('\n=== 验证 versions ===');
  const verifyVersions = await db.collection('versions').find({}).toArray();
  for (const v of verifyVersions) {
    console.log(`  ${v.versionId}: ${v.name} (${v.lang})`);
  }
  
  console.log('\n=== 验证 version_configs ===');
  const verifyConfigs = await db.collection('version_configs').find({}).toArray();
  for (const c of verifyConfigs) {
    console.log(`  versionId ${c.versionId}:`);
    for (const g of c.grades) {
      console.log(`    - ${g.name}: ${g.desc}`);
    }
  }

  await mongoose.disconnect();
  console.log('\nDone!');
}

fixGarbledData().catch(console.error);
