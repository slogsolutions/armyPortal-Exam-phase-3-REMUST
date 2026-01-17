const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const ranks = [
    "Signalman",
    "Lance Naik",
    "Naik",
    "Havildar",
    "Company Havildar Major",
    "Company Quarter Master Havildar",
    "Regimental Havildar Major",
    "Naib Subedar",
    "Subedar",
    "Subedar Major",
    "Lance Havildar",
    "Acting Havildar",
    "Local Havildar",
    "Local Naik",
  ];

  for (const name of ranks) {
    await prisma.rank.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  console.log("✅ Rank seeding completed");
}

main()
  .catch((e) => {
    console.error("❌ Rank seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
