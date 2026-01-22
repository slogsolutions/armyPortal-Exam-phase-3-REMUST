require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Trade fields explained:
 * - defaultTime → Exam duration
 * - totalQuestions → Total number of questions
 * - totalMarks → Max marks
 * - negativeMarking → Per-question negative (0 if none)
 * - wpX / prX / oral → Whether component exists
 */

const trades = [
  {
    name: "JE NE REMUST",
    defaultTime: 60,
    totalQuestions: 70,
    totalMarks: 70,
    negativeMarking: 0.5,
    wp1: true,
    wp2: false,
    wp3: false,
    pr1: false,
    pr2: false,
    pr3: false,
    pr4: false,
    pr5: false,
    oral: false
  },
  {
    name: "JE SYS REMUST",
    defaultTime: 60,
    totalQuestions: 70,
    totalMarks: 70,
    negativeMarking: 0.5,
    wp1: true,
    wp2: false,
    wp3: false,
    pr1: false,
    pr2: false,
    pr3: false,
    pr4: false,
    pr5: false,
    oral: false
  },
  {
    name: "OP CIPH REMUST",
    defaultTime: 60,
    totalQuestions: 100,
    totalMarks: 100,
    negativeMarking: 0.5,
    wp1: true,
    wp2: false,
    wp3: false,
    pr1: false,
    pr2: false,
    pr3: false,
    pr4: false,
    pr5: false,
    oral: false
  },
  {
    name: "UN MSN / IMTRAT",
    defaultTime: 20,
    totalQuestions: 50,
    totalMarks: 50,
    negativeMarking: 0.25,
    wp1: false,
    wp2: false,
    wp3: false,
    pr1: false,
    pr2: false,
    pr3: false,
    pr4: false,
    pr5: false,
    oral: false
  },
  {
    name: "OSS ENTRANCE",
    defaultTime: 25,
    totalQuestions: 50,
    totalMarks: 50,
    negativeMarking: 0,
    wp1: true,
    wp2: true,
    wp3: false,
    pr1: false,
    pr2: false,
    pr3: false,
    pr4: false,
    pr5: false,
    oral: false
  },
  {
    name: "OCC CL-II",
    defaultTime: 50,
    totalQuestions: 100,
    totalMarks: 100,
    negativeMarking: 0,
    wp1: true,
    wp2: true,
    wp3: false,
    pr1: true,
    pr2: true,
    pr3: true,
    pr4: true,
    pr5: true,
    oral: false
  },
  {
    name: "DR CL-I",
    defaultTime: 25,
    totalQuestions: 50,
    totalMarks: 50,
    negativeMarking: 0,
    wp1: true,
    wp2: false,
    wp3: false,
    pr1: true,
    pr2: true,
    pr3: true,
    pr4: true,
    pr5: false,
    oral: false
  },
  {
    name: "DR CL-II",
    defaultTime: 25,
    totalQuestions: 50,
    totalMarks: 50,
    negativeMarking: 0,
    wp1: true,
    wp2: false,
    wp3: false,
    pr1: true,
    pr2: true,
    pr3: true,
    pr4: false,
    pr5: false,
    oral: false
  },
  {
    name: "DVR MT CL-I",
    defaultTime: 50,
    totalQuestions: 100,
    totalMarks: 100,
    negativeMarking: 0,
    wp1: true,
    wp2: false,
    wp3: false,
    pr1: true,
    pr2: true,
    pr3: true,
    pr4: true,
    pr5: false,
    oral: false
  },
  {
    name: "DVR MT CL-II",
    defaultTime: 30,
    totalQuestions: 30,
    totalMarks: 30,
    negativeMarking: 0,
    wp1: false,
    wp2: false,
    wp3: false,
    pr1: true,
    pr2: true,
    pr3: false,
    pr4: false,
    pr5: false,
    oral: true
  }
];

async function seedTrades() {
  console.log('🌱 Seeding trades...');

  try {
    for (const trade of trades) {
      await prisma.trade.upsert({
        where: { name: trade.name },
        update: trade,
        create: trade
      });

      console.log(`✅ Seeded: ${trade.name}`);
    }

    console.log('✅ All trades seeded successfully');
  } catch (error) {
    console.error('❌ Trade seeding failed:', error);
    throw error;
  }
}

async function main() {
  try {
    console.log('🚀 Starting trade seed...');
    await seedTrades();
    console.log('🎉 Trade seeding completed!');
  } catch (err) {
    console.error(err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}

module.exports = { seedTrades };
