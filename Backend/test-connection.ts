import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const categories = await prisma.category.findMany();
    console.log("Connected! Categories:", categories);
  } catch (err) {
    console.error("DB connection failed:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
