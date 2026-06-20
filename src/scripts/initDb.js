/**
 * 初始化数据库
 * 运行: node src/scripts/initDb.js
 */

const mongoose = require('mongoose');
const config = require('../config');
const InviteCode = require('../models/InviteCode');
const User = require('../models/User');

// 未使用的邀请码列表
const unusedInviteCodes = [
  'H2J4K7MN', 'D8G0W3ET', 'P5S2U6AY', 'Q1O9I4RE', 'T4W7J2BD',
  'F9N6H3LC', 'M3K8F1PX', 'Z5A2V8GM', 'Y7R4E9JW', 'C2D6U1SN',
  'G8H4O3BQ', 'K1L5T9WV', 'X6M2N8FP', 'W9J7C4ZA', 'N3B5R1EK',
  'E4D8G6LT', 'U7Y2H9XS', 'A1C6T4MP', 'S8K3R7WB', 'F5L9V2NQ',
  'J6D4G8HC', 'P2M7T1XY', 'R9N5B3KF', 'H4Q8L6DT', 'Z1V7C9WA',
  'Y3E6R2MJ', 'B8K4H1UL', 'W5P9N3GT', 'C7A2J8SX', 'M6F3R9BQ',
  'T1D8G4LZ', 'L9V5N2CP', 'X4K8H7EM', 'D2W6T1RY', 'S7B3J9AZ',
  'Q5M4C8FP', 'G1N9R6TL', 'J3H8K2WV', 'U6P5E1MQ', 'N8R4B7DX',
  'E2L9V6CT', 'K7A3W8HN', 'Y9T5D2JF', 'F4G6R1SB', 'W1C8M9BX',
  'P3N7V5LQ', 'Z6H2K8TY', 'M8L4E1WR', 'R5D9B3JM', 'H2A7Q6FK',
  'C9K4N8DU', 'T6V1G3XZ', 'L3P8W2MA', 'X7B5T9EG', 'J1Y4R7HT',
  'U9F2K8NP', 'E4M6C1QL', 'D8T5R3VW', 'B5N7H9AC', 'G2J8K4FM',
  'W6Q9L1BR', 'S3E7A5YJ', 'Y1P4T8NM', 'Z8L6R2QH', 'M5C9V3DK',
  'R7B2W8FX', 'K9G4H1UT', 'H3V7T5LW', 'C1A8P6MQ', 'T4D6J9RZ',
  'L8F5E3BV', 'X2N9K7CY', 'Q6W4G8TA', 'J5M7B1XK', 'U3H9P6DN',
  'N4R8V2FL', 'E7Q5C3JM', 'A9L2K6HW', 'P1T8D4YF', 'W8E3N7QB',
  'Z4F6R9AS', 'M2G5J8LU', 'R9C7B3VT', 'H6V1T4XW', 'D3K9P5RY',
  'S1L7A8HN', 'Y5E4C9BM', 'B8Q2W6FT', 'G6H3R1ZK', 'T9J5N2GV',
  'C4M8D7LQ', 'X7P3V9AW', 'K1R6T5BY', 'U5F8K2CX', 'L9D4H7NQ',
  'J2B6E1WR', 'E8A5G3TV', 'F7K2N9JX', 'Q4T6H1MW', 'C8L3P7RZ', 'Y9V5D2BT', 'H1R8K6EQ', 'M6G4A9FL', 'W3E7N1CQ', 'B5X8T4JH', 'K2M9V7RG', 'P7C1H5DX', 'L4Y8F3KW', 'J9Q6T2MZ', 'N8A4R7BS', 'U3H1E9LY', 'D6L5V8CN', 'G1W9K4FP', 'R5C8T6BV', 'X4E2P7QM', 'T7K3H9RG', 'Z2N6A4JX'
];

async function initDatabase() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(config.mongodbUri);
    console.log('MongoDB connected successfully');

    // 初始化邀请码
    console.log('\nInitializing invite codes...');
    let inserted = 0;
    let skipped = 0;

    for (const code of unusedInviteCodes) {
      const existing = await InviteCode.findOne({ code });
      if (!existing) {
        await InviteCode.create({ code, used: false });
        inserted++;
      } else {
        skipped++;
      }
    }

    console.log(`Invite codes: ${inserted} inserted, ${skipped} skipped`);

    // 打印统计
    const totalCodes = await InviteCode.countDocuments();
    const usedCodes = await InviteCode.countDocuments({ used: true });
    const unusedCodes = await InviteCode.countDocuments({ used: false });

    console.log('\nInvite code statistics:');
    console.log(`  Total: ${totalCodes}`);
    console.log(`  Used: ${usedCodes}`);
    console.log(`  Unused: ${unusedCodes}`);

    // 打印未使用的邀请码（用于测试）
    if (unusedCodes > 0) {
      const unused = await InviteCode.find({ used: false }).limit(5);
      console.log('\nSample unused invite codes for testing:');
      unused.forEach(invite => console.log(`  - ${invite.code}`));
    }

    console.log('\n✅ Database initialization complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    process.exit(1);
  }
}

initDatabase();
