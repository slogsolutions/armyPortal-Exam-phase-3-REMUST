// const { PrismaClient } = require('@prisma/client');
// module.exports = new PrismaClient();

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

module.exports = prisma;