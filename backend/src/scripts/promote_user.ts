
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function promoteUser() {
    const email = 'admin@test.com';
    try {
        const user = await prisma.user.update({
            where: { email },
            data: {
                role: 'ADMIN',
                isActive: true
            }
        });
        console.log(`User ${email} successfully promoted to ADMIN and activated.`);
        console.log(user);
    } catch (error) {
        console.error(`Error promoting user ${email}:`, error);
    } finally {
        await prisma.$disconnect();
    }
}

promoteUser();
