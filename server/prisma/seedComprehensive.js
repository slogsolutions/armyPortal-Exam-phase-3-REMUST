const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

// Trade configuration with exam patterns
const tradeConfigs = [
  {
    name: "JE NE REMUST",
    negativeMarking: 0.25,
    minPercent: 40,
    wp1: true,
    wp2: true,
    wp3: false,
    pr1: true,
    pr2: true,
    pr3: true,
    pr4: false,
    pr5: false,
    oral: true
  },
  {
    name: "OCC CL-II",
    negativeMarking: 0.33,
    minPercent: 45,
    wp1: true,
    wp2: true,
    wp3: true,
    pr1: true,
    pr2: true,
    pr3: false,
    pr4: false,
    pr5: false,
    oral: true
  },
  {
    name: "TECH GR-I",
    negativeMarking: 0.25,
    minPercent: 50,
    wp1: true,
    wp2: true,
    wp3: false,
    pr1: true,
    pr2: true,
    pr3: true,
    pr4: true,
    pr5: false,
    oral: true
  },
  {
    name: "TECH GR-II",
    negativeMarking: 0.20,
    minPercent: 40,
    wp1: true,
    wp2: false,
    wp3: false,
    pr1: true,
    pr2: true,
    pr3: false,
    pr4: false,
    pr5: false,
    oral: false
  },
  {
    name: "CLERK SD/CKT",
    negativeMarking: 0.0,
    minPercent: 35,
    wp1: true,
    wp2: true,
    wp3: false,
    pr1: false,
    pr2: false,
    pr3: false,
    pr4: false,
    pr5: false,
    oral: true
  },
  {
    name: "WMT CHEF",
    negativeMarking: 0.25,
    minPercent: 40,
    wp1: true,
    wp2: false,
    wp3: false,
    pr1: true,
    pr2: true,
    pr3: true,
    pr4: true,
    pr5: true,
    oral: true
  },
  {
    name: "WMT COMN",
    negativeMarking: 0.33,
    minPercent: 45,
    wp1: true,
    wp2: false,
    wp3: false,
    pr1: true,
    pr2: true,
    pr3: true,
    pr4: false,
    pr5: false,
    oral: true
  },
  {
    name: "WMT STWD",
    negativeMarking: 0.25,
    minPercent: 40,
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
    name: "ARTIFICER",
    negativeMarking: 0.50,
    minPercent: 55,
    wp1: true,
    wp2: true,
    wp3: true,
    pr1: true,
    pr2: true,
    pr3: true,
    pr4: true,
    pr5: true,
    oral: true
  },
  {
    name: "DRAFTSMAN",
    negativeMarking: 0.25,
    minPercent: 45,
    wp1: true,
    wp2: true,
    wp3: false,
    pr1: true,
    pr2: true,
    pr3: false,
    pr4: false,
    pr5: false,
    oral: true
  }
];

// Command configurations
const commands = [
  { name: "Northern Command" },
  { name: "Southern Command" },
  { name: "Eastern Command" },
  { name: "Western Command" },
  { name: "Central Command" },
  { name: "South Western Command" },
  { name: "Army Training Command" }
];

// Center configurations by command
const centers = [
  // Northern Command
  { name: "Srinagar", commandName: "Northern Command" },
  { name: "Udhampur", commandName: "Northern Command" },
  { name: "Pathankot", commandName: "Northern Command" },
  
  // Southern Command
  { name: "Pune", commandName: "Southern Command" },
  { name: "Aurangabad", commandName: "Southern Command" },
  { name: "Secunderabad", commandName: "Southern Command" },
  
  // Eastern Command
  { name: "Kolkata", commandName: "Eastern Command" },
  { name: "Guwahati", commandName: "Eastern Command" },
  { name: "Siliguri", commandName: "Eastern Command" },
  
  // Western Command
  { name: "Chandimandir", commandName: "Western Command" },
  { name: "Jodhpur", commandName: "Western Command" },
  { name: "Ahmedabad", commandName: "Western Command" },
  
  // Central Command
  { name: "Lucknow", commandName: "Central Command" },
  { name: "Bareilly", commandName: "Central Command" },
  { name: "Allahabad", commandName: "Central Command" },
  
  // South Western Command
  { name: "Jaipur", commandName: "South Western Command" },
  { name: "Ajmer", commandName: "South Western Command" },
  { name: "Raipur", commandName: "South Western Command" },
  { name: "Bhopal", commandName: "South Western Command" },
  
  // Army Training Command
  { name: "Shimla", commandName: "Army Training Command" },
  { name: "Dehradun", commandName: "Army Training Command" }
];

// Rank configurations
const ranks = [
  { name: "Sepoy" },
  { name: "Lance Naik" },
  { name: "Naik" },
  { name: "Havildar" },
  { name: "Naib Subedar" },
  { name: "Subedar" },
  { name: "Subedar Major" },
  { name: "Honorary Lieutenant" },
  { name: "Honorary Captain" }
];

async function seedTrades() {
  console.log("🌱 Seeding trades with exam patterns...");
  
  for (const config of tradeConfigs) {
    await prisma.trade.upsert({
      where: { name: config.name },
      update: config,
      create: config
    });
  }
  
  console.log(`✅ Seeded ${tradeConfigs.length} trades`);
}

async function seedCommands() {
  console.log("🌱 Seeding commands...");
  
  for (const command of commands) {
    await prisma.command.upsert({
      where: { name: command.name },
      update: command,
      create: command
    });
  }
  
  console.log(`✅ Seeded ${commands.length} commands`);
}

async function seedCenters() {
  console.log("🌱 Seeding conducting centers...");
  
  for (const center of centers) {
    const command = await prisma.command.findUnique({
      where: { name: center.commandName }
    });
    
    if (command) {
      await prisma.conductingCenter.upsert({
        where: { name: center.name },
        update: { commandId: command.id },
        create: {
          name: center.name,
          commandId: command.id
        }
      });
    }
  }
  
  console.log(`✅ Seeded ${centers.length} centers`);
}

async function seedRanks() {
  console.log("🌱 Seeding ranks...");
  
  for (const rank of ranks) {
    await prisma.rank.upsert({
      where: { name: rank.name },
      update: rank,
      create: rank
    });
  }
  
  console.log(`✅ Seeded ${ranks.length} ranks`);
}

async function createAdminUser() {
  console.log("🌱 Creating admin user...");
  
  const hashedPassword = await bcrypt.hash("admin123", 10);
  
  await prisma.admin.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      password: hashedPassword,
      role: "SUPER_ADMIN"
    }
  });
  
  console.log("✅ Created admin user (username: admin, password: admin123)");
}

async function main() {
  try {
    await seedCommands();
    await seedCenters();
    await seedRanks();
    await seedTrades();
    await createAdminUser();
    
    console.log("\n🎉 Database seeding completed successfully!");
    console.log("\n📋 Trade Summary:");
    
    const trades = await prisma.trade.findMany({
      select: {
        name: true,
        negativeMarking: true,
        minPercent: true,
        wp1: true,
        wp2: true,
        wp3: true,
        pr1: true,
        pr2: true,
        pr3: true,
        pr4: true,
        pr5: true,
        oral: true
      }
    });
    
    trades.forEach(trade => {
      const exams = [];
      if (trade.wp1) exams.push("WP-I");
      if (trade.wp2) exams.push("WP-II");
      if (trade.wp3) exams.push("WP-III");
      if (trade.pr1) exams.push("PR-I");
      if (trade.pr2) exams.push("PR-II");
      if (trade.pr3) exams.push("PR-III");
      if (trade.pr4) exams.push("PR-IV");
      if (trade.pr5) exams.push("PR-V");
      if (trade.oral) exams.push("ORAL");
      
      console.log(`  • ${trade.name}: ${exams.join(", ")} (Neg: ${trade.negativeMarking || 0}, Min: ${trade.minPercent}%)`);
    });
    
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}

module.exports = { main, tradeConfigs, commands, centers, ranks };
