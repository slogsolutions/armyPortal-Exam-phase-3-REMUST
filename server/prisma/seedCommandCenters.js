const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const commandNames = [
    "Southern Command",
    "Eastern Command",
    "Western Command",
    "Central Command",
    "Northern Command",
    "South Western Command",
    "Andaman & Nicobar Command",
    "ARTRAC"
  ];

  const commandIdByName = {};

  for (const name of commandNames) {
    const command = await prisma.command.upsert({
      where: { name },
      update: {},
      create: { name }
    });

    commandIdByName[name] = command.id;
  }

  const centerSeeds = [
    { name: "Chennai Cantonment", command: "Southern Command" },
    { name: "Secunderabad Drill Ground", command: "Southern Command" },
    { name: "Bengaluru Training Wing", command: "Southern Command" },
    { name: "Fort William Complex", command: "Eastern Command" },
    { name: "Tezpur Field Depot", command: "Eastern Command" },
    { name: "Dimapur Logistics Base", command: "Eastern Command" },
    { name: "Jalandhar Parade Grounds", command: "Western Command" },
    { name: "Ambala Aviation Hub", command: "Western Command" },
    { name: "Bathinda Firing Range", command: "Western Command" },
    { name: "Lucknow Staff College", command: "Central Command" },
    { name: "Allahabad Signals Station", command: "Central Command" },
    { name: "Jhansi Armour School", command: "Central Command" },
    { name: "Udhampur Headquarters Annex", command: "Northern Command" },
    { name: "Leh High Altitude Centre", command: "Northern Command" },
    { name: "Srinagar Transit Camp", command: "Northern Command" },
    { name: "Jaipur Composite Node", command: "South Western Command" },
    { name: "Ahmedabad Logistics Yard", command: "South Western Command" },
    { name: "Jodhpur Desert Warfare Park", command: "South Western Command" },
    { name: "Port Blair Joint Ops School", command: "Andaman & Nicobar Command" },
    { name: "Car Nicobar Airstrip Annex", command: "Andaman & Nicobar Command" },
    { name: "Campbell Bay Forward Base", command: "Andaman & Nicobar Command" },
    { name: "Shimla Doctrine Cell", command: "ARTRAC" },
    { name: "Chandimandir Strategic Studies", command: "ARTRAC" },
    { name: "Mhow Tactical Simulator", command: "ARTRAC" }
  ];

  for (const { name, command } of centerSeeds) {
    const commandId = commandIdByName[command];

    if (!commandId) {
      console.warn(`⚠️ Skipping center "${name}" because command "${command}" does not exist.`);
      continue;
    }

    await prisma.conductingCenter.upsert({
      where: {
        commandId_name: {
          commandId,
          name
        }
      },
      update: {},
      create: {
        name,
        commandId
      }
    });
  }

  console.log("✅ Commands and conducting centers seeded successfully");
}

main()
  .catch((error) => {
    console.error("❌ Seeding commands and centers failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
