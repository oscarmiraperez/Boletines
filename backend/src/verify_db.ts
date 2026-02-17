import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        const userCount = await prisma.user.count();
        console.log(`Users found: ${userCount}`);

        const admin = await prisma.user.findFirst({
            where: { email: 'admin@test.com' }
        });

        if (admin) {
            console.log('✅ Admin user found:', admin.email);
            console.log('Role:', admin.role);
        } else {
            console.error('❌ Admin user NOT found');
        }

        const expedientes = await prisma.expediente.count();
        console.log(`Expedientes found: ${expedientes}`);

    } catch (error) {
        console.error('Error connecting to DB:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
