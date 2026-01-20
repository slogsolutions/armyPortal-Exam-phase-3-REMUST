require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Import trade seeding function
const { seedTrades } = require('./seedTrades');

// Sample exam questions for demonstration
const sampleQuestions = [
  {
    tradeName: "JE NE REMUST",
    paperType: "WP-I",
    question: "What is the primary function of a router in computer networks?",
    optionA: "To forward data packets",
    optionB: "To assign IP addresses",
    optionC: "To connect multiple networks",
    optionD: "To filter network traffic",
    correctAnswer: "A",
    marks: 2.0
  },
  {
    tradeName: "JE NE REMUST",
    paperType: "WP-I",
    question: "Which protocol is used for secure web communication?",
    optionA: "HTTP",
    optionB: "HTTPS",
    optionC: "FTP",
    optionD: "SSH",
    correctAnswer: "B",
    marks: 2.0
  },
  {
    tradeName: "OCC CL-II",
    paperType: "WP-II",
    question: "What is the purpose of a firewall in network security?",
    optionA: "To block unauthorized access",
    optionB: "To monitor network traffic",
    optionC: "To encrypt data transmission",
    optionD: "All of the above",
    correctAnswer: "D",
    marks: 3.0
  }
];

async function seedQuestions() {
  console.log('📝 Seeding sample questions...');
  
  try {
    for (const questionData of sampleQuestions) {
      const { tradeName, paperType, question, optionA, optionB, optionC, optionD, correctAnswer, marks } = questionData;
      
      // Find trade and paper
      const trade = await prisma.trade.findUnique({ where: { name: tradeName } });
      const paper = await prisma.examPaper.findFirst({ 
        where: { 
          tradeId: trade.id,
          paperType 
        } 
      });
      
      if (trade && paper) {
        await prisma.question.create({
          data: {
            question,
            optionA,
            optionB,
            optionC,
            optionD,
            correctAnswer,
            marks: parseFloat(marks),
            examPaperId: paper.id
          }
        });
        
        console.log(`  ✅ Added question for ${tradeName} - ${paperType}`);
      }
    }
    
    console.log('✅ Sample questions seeded successfully!');
    
  } catch (error) {
    console.error('❌ Error seeding questions:', error);
    throw error;
  }
}

async function main() {
  console.log('🚀 Starting comprehensive database seeding...');
  
  try {
    // Seed trades with configuration
    await seedTrades();
    
    // Seed sample questions
    await seedQuestions();
    
    console.log('🎉 Comprehensive seeding completed successfully!');
    console.log('');
    console.log('📋 Summary:');
    console.log('   ✅ Trades with negative marking and paper patterns');
    console.log('   ✅ Exam papers for all enabled types');
    console.log('   ✅ Sample questions for testing');
    console.log('');
    console.log('🔑 Default Admin Credentials:');
    console.log('   Username: admin');
    console.log('   Password: admin123');
    console.log('');
    console.log('🌐 Access URLs:');
    console.log('   Frontend: http://localhost:3000');
    console.log('   Backend API: http://localhost:5000');
    console.log('   Health Check: http://localhost:5000/test');
    
  } catch (error) {
    console.error('💥 Seeding failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main, seedTrades, seedQuestions };
