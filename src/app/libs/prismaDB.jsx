import { PrismaClient } from "@prisma/client";


/** @type {typeof globalThis & { prisma?: PrismaClient }} */
const globalForPrisma = globalThis;
/** @type {PrismaClient} */
const client = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = client;
}

export default client;
