
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        const users = await prisma.user.findMany();
        console.log('--- Current Users in DB ---');
        if (users.length === 0) {
            console.log('No users found.');
        } else {
            console.table(users.map(u => ({ id: u.id, email: u.email, role: u.role, isActive: u.isActive })));
        }
        console.log('---------------------------');
    } catch (e) {
        console.error('Error connecting to DB:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
