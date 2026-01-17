const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const commands = [
    "Southern Command",
    "Eastern Command",
    "Western Command",
    "Central Command",
    "Northern Command",
    "South Western Command",
    "Andaman & Nicobar Command",
    "ARTRAC",
  ];

  for (const name of commands) {
    await prisma.command.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  console.log("✅ Command seeding completed");
}

main()
  .catch((e) => {
    console.error("❌ Command seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
