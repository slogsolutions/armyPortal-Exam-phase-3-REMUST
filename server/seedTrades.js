const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Comprehensive trade data with negative marking and paper patterns
const tradesWithConfig = [
  {
    name: "JE NE REMUST",
    negativeMarking: 0.25,
    minPercent: 40,
    paperPattern: {
      wp1: { questions: 50, duration: 60, marks: 100 },
      wp2: { questions: 50, duration: 60, marks: 100 },
      wp3: { questions: 50, duration: 60, marks: 100 },
      pr1: { questions: 0, duration: 30, marks: 50 },
      pr2: { questions: 0, duration: 30, marks: 50 },
      pr3: { questions: 0, duration: 30, marks: 50 },
      pr4: { questions: 0, duration: 30, marks: 50 },
      pr5: { questions: 0, duration: 30, marks: 50 },
      oral: { questions: 0, duration: 15, marks: 50 }
    }
  },
  {
    name: "OCC CL-II",
    negativeMarking: 0.33,
    minPercent: 45,
    paperPattern: {
      wp1: { questions: 60, duration: 90, marks: 100 },
      wp2: { questions: 60, duration: 90, marks: 100 },
      wp3: { questions: 60, duration: 90, marks: 100 },
      pr1: { questions: 0, duration: 45, marks: 100 },
      pr2: { questions: 0, duration: 45, marks: 100 },
      pr3: { questions: 0, duration: 45, marks: 100 },
      pr4: { questions: 0, duration: 45, marks: 100 },
      pr5: { questions: 0, duration: 45, marks: 100 },
      oral: { questions: 0, duration: 20, marks: 100 }
    }
  },
  {
    name: "TECH GD",
    negativeMarking: 0.50,
    minPercent: 50,
    paperPattern: {
      wp1: { questions: 75, duration: 120, marks: 100 },
      wp2: { questions: 75, duration: 120, marks: 100 },
      wp3: { questions: 75, duration: 120, marks: 100 },
      pr1: { questions: 0, duration: 60, marks: 100 },
      pr2: { questions: 0, duration: 60, marks: 100 },
      pr3: { questions: 0, duration: 60, marks: 100 },
      pr4: { questions: 0, duration: 60, marks: 100 },
      pr5: { questions: 0, duration: 60, marks: 100 },
      oral: { questions: 0, duration: 30, marks: 100 }
    }
  },
  {
    name: "SKT (TECH)",
    negativeMarking: 0.25,
    minPercent: 40,
    paperPattern: {
      wp1: { questions: 50, duration: 60, marks: 100 },
      wp2: { questions: 50, duration: 60, marks: 100 },
      wp3: { questions: 50, duration: 60, marks: 100 },
      pr1: { questions: 0, duration: 30, marks: 50 },
      pr2: { questions: 0, duration: 30, marks: 50 },
      pr3: { questions: 0, duration: 30, marks: 50 },
      pr4: { questions: 0, duration: 30, marks: 50 },
      pr5: { questions: 0, duration: 30, marks: 50 },
      oral: { questions: 0, duration: 15, marks: 50 }
    }
  },
  {
    name: "Havildar",
    negativeMarking: 0.20,
    minPercent: 35,
    paperPattern: {
      wp1: { questions: 40, duration: 45, marks: 100 },
      wp2: { questions: 40, duration: 45, marks: 100 },
      wp3: { questions: 40, duration: 45, marks: 100 },
      pr1: { questions: 0, duration: 20, marks: 50 },
      pr2: { questions: 0, duration: 20, marks: 50 },
      pr3: { questions: 0, duration: 20, marks: 50 },
      pr4: { questions: 0, duration: 20, marks: 50 },
      pr5: { questions: 0, duration: 20, marks: 50 },
      oral: { questions: 0, duration: 10, marks: 50 }
    }
  },
  {
    name: "Naib Subedar",
    negativeMarking: 0.15,
    minPercent: 35,
    paperPattern: {
      wp1: { questions: 40, duration: 45, marks: 100 },
      wp2: { questions: 40, duration: 45, marks: 100 },
      wp3: { questions: 40, duration: 45, marks: 100 },
      pr1: { questions: 0, duration: 20, marks: 50 },
      pr2: { questions: 0, duration: 20, marks: 50 },
      pr3: { questions: 0, duration: 20, marks: 50 },
      pr4: { questions: 0, duration: 20, marks: 50 },
      pr5: { questions: 0, duration: 20, marks: 50 },
      oral: { questions: 0, duration: 10, marks: 50 }
    }
  },
  {
    name: "Subedar",
    negativeMarking: 0.10,
    minPercent: 35,
    paperPattern: {
      wp1: { questions: 40, duration: 45, marks: 100 },
      wp2: { questions: 40, duration: 45, marks: 100 },
      wp3: { questions: 40, duration: 45, marks: 100 },
      pr1: { questions: 0, duration: 20, marks: 50 },
      pr2: { questions: 0, duration: 20, marks: 50 },
      pr3: { questions: 0, duration: 20, marks: 50 },
      pr4: { questions: 0, duration: 20, marks: 50 },
      pr5: { questions: 0, duration: 20, marks: 50 },
      oral: { questions: 0, duration: 10, marks: 50 }
    }
  },
  {
    name: "Lance Naik",
    negativeMarking: 0.25,
    minPercent: 40,
    paperPattern: {
      wp1: { questions: 50, duration: 60, marks: 100 },
      wp2: { questions: 50, duration: 60, marks: 100 },
      wp3: { questions: 50, duration: 60, marks: 100 },
      pr1: { questions: 0, duration: 30, marks: 50 },
      pr2: { questions: 0, duration: 30, marks: 50 },
      pr3: { questions: 0, duration: 30, marks: 50 },
      pr4: { questions: 0, duration: 30, marks: 50 },
      pr5: { questions: 0, duration: 30, marks: 50 },
      oral: { questions: 0, duration: 15, marks: 50 }
    }
  },
  {
    name: "Nursing Assistant",
    negativeMarking: 0.20,
    minPercent: 45,
    paperPattern: {
      wp1: { questions: 60, duration: 90, marks: 100 },
      wp2: { questions: 60, duration: 90, marks: 100 },
      wp3: { questions: 60, duration: 90, marks: 100 },
      pr1: { questions: 0, duration: 45, marks: 100 },
      pr2: { questions: 0, duration: 45, marks: 100 },
      pr3: { questions: 0, duration: 45, marks: 100 },
      pr4: { questions: 0, duration: 45, marks: 100 },
      pr5: { questions: 0, duration: 45, marks: 100 },
      oral: { questions: 0, duration: 20, marks: 100 }
    }
  },
  {
    name: "Clerk (SD)",
    negativeMarking: 0.15,
    minPercent: 40,
    paperPattern: {
      wp1: { questions: 30, duration: 30, marks: 100 },
      wp2: { questions: 30, duration: 30, marks: 100 },
      wp3: { questions: 30, duration: 30, marks: 100 },
      pr1: { questions: 0, duration: 15, marks: 50 },
      pr2: { questions: 0, duration: 15, marks: 50 },
      pr3: { questions: 0, duration: 15, marks: 50 },
      pr4: { questions: 0, duration: 15, marks: 50 },
      pr5: { questions: 0, duration: 15, marks: 50 },
      oral: { questions: 0, duration: 10, marks: 50 }
    }
  },
  {
    name: "Cook (GD)",
    negativeMarking: 0.33,
    minPercent: 45,
    paperPattern: {
      wp1: { questions: 60, duration: 90, marks: 100 },
      wp2: { questions: 60, duration: 90, marks: 100 },
      wp3: { questions: 60, duration: 90, marks: 100 },
      pr1: { questions: 0, duration: 45, marks: 100 },
      pr2: { questions: 0, duration: 45, marks: 100 },
      pr3: { questions: 0, duration: 45, marks: 100 },
      pr4: { questions: 0, duration: 45, marks: 100 },
      pr5: { questions: 0, duration: 45, marks: 100 },
      oral: { questions: 0, duration: 20, marks: 100 }
    }
  },
  {
    name: "Artificer (SM)",
    negativeMarking: 0.25,
    minPercent: 40,
    paperPattern: {
      wp1: { questions: 50, duration: 60, marks: 100 },
      wp2: { questions: 50, duration: 60, marks: 100 },
      wp3: { questions: 50, duration: 60, marks: 100 },
      pr1: { questions: 0, duration: 30, marks: 50 },
      pr2: { questions: 0, duration: 30, marks: 50 },
      pr3: { questions: 0, duration: 30, marks: 50 },
      pr4: { questions: 0, duration: 30, marks: 50 },
      pr5: { questions: 0, duration: 30, marks: 50 },
      oral: { questions: 0, duration: 15, marks: 50 }
    }
  }
];

async function seedTrades() {
  console.log('🌱 Seeding trades with comprehensive configuration...');
  
  try {
    for (const tradeConfig of tradesWithConfig) {
      const { name, negativeMarking, minPercent, paperPattern } = tradeConfig;
      
      // Create trade with paper pattern configuration
      const trade = await prisma.trade.upsert({
        where: { name },
        update: {
          negativeMarking,
          minPercent,
          wp1: paperPattern.wp1.questions > 0,
          wp2: paperPattern.wp2.questions > 0,
          wp3: paperPattern.wp3.questions > 0,
          pr1: paperPattern.pr1.questions > 0,
          pr2: paperPattern.pr2.questions > 0,
          pr3: paperPattern.pr3.questions > 0,
          pr4: paperPattern.pr4.questions > 0,
          pr5: paperPattern.pr5.questions > 0,
          oral: paperPattern.oral.questions > 0
        },
        create: {
          name,
          negativeMarking,
          minPercent,
          wp1: paperPattern.wp1.questions > 0,
          wp2: paperPattern.wp2.questions > 0,
          wp3: paperPattern.wp3.questions > 0,
          pr1: paperPattern.pr1.questions > 0,
          pr2: paperPattern.pr2.questions > 0,
          pr3: paperPattern.pr3.questions > 0,
          pr4: paperPattern.pr4.questions > 0,
          pr5: paperPattern.pr5.questions > 0,
          oral: paperPattern.oral.questions > 0
        }
      });
      
      console.log(`✅ Created trade: ${name}`);
      
      // Create exam papers for each enabled paper type
      const paperTypes = [
        { type: 'WP-I', field: 'wp1', config: paperPattern.wp1 },
        { type: 'WP-II', field: 'wp2', config: paperPattern.wp2 },
        { type: 'WP-III', field: 'wp3', config: paperPattern.wp3 },
        { type: 'PR-I', field: 'pr1', config: paperPattern.pr1 },
        { type: 'PR-II', field: 'pr2', config: paperPattern.pr2 },
        { type: 'PR-III', field: 'pr3', config: paperPattern.pr3 },
        { type: 'PR-IV', field: 'pr4', config: paperPattern.pr4 },
        { type: 'PR-V', field: 'pr5', config: paperPattern.pr5 },
        { type: 'ORAL', field: 'oral', config: paperPattern.oral }
      ];
      
      for (const paperType of paperTypes) {
        if (paperType.config.questions > 0) {
          await prisma.examPaper.upsert({
            where: {
              tradeId_paperType: {
                tradeId: trade.id,
                paperType: paperType.type
              }
            },
            update: {
              isActive: true
            },
            create: {
              tradeId: trade.id,
              paperType: paperType.type,
              isActive: true
            }
          });
          
          console.log(`  📄 Created paper: ${paperType.type} for ${name}`);
        }
      }
    }
    
    console.log('✅ Trades seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Error seeding trades:', error);
    throw error;
  }
}

// Export for use in main seed file
module.exports = { seedTrades, tradesWithConfig };

// Run if called directly
if (require.main === module) {
  seedTrades()
    .then(() => {
      console.log('🎉 Trade seeding process completed!');
    })
    .catch((error) => {
      console.error('💥 Seeding failed:', error);
      process.exit(1);
    });
}
