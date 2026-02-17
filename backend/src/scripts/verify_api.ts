
import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const API_URL = 'http://localhost:3000/api';

async function testGetUsers() {
    try {
        // 1. Create a temporary admin user if not exists or use existing
        let email = 'test_verify_backend@test.com';
        let password = 'password123';

        let user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            const hashedPassword = await bcrypt.hash(password, 10);
            user = await prisma.user.create({
                data: {
                    email,
                    password: hashedPassword,
                    name: 'Test Verify',
                    role: 'ADMIN',
                    isActive: true,
                }
            });
            console.log('Created temporary test user');
        } else {
            // Update password just to be sure we can login
            const hashedPassword = await bcrypt.hash(password, 10);
            await prisma.user.update({ where: { id: user.id }, data: { password: hashedPassword } });
        }

        // 2. Login to get token
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email,
            password
        });
        const token = loginRes.data.token;
        console.log('Got token:', token ? 'YES' : 'NO');

        // 3. Call getUsers
        const usersRes = await axios.get(`${API_URL}/users`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        const users = usersRes.data;
        console.log(`Fetched ${users.length} users.`);

        if (users.length > 0) {
            const firstUser = users[0];
            console.log('First user keys:', Object.keys(firstUser));
            if ('expedientesOperador' in firstUser && 'expedientesTecnico' in firstUser) {
                console.log('SUCCESS: Backend is returning expedientes fields!');
            } else {
                console.error('FAILURE: Backend is NOT returning expedientes fields.');
                console.log('Sample user:', JSON.stringify(firstUser, null, 2));
                process.exit(1);
            }
        }

        // Cleanup
        // await prisma.user.delete({ where: { email } });

    } catch (err: any) {
        console.error('Error:', err.message);
        if (err.response) console.error(err.response.data);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

testGetUsers();
