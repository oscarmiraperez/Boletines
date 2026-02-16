import prisma from './db';

const testCreateExpediente = async () => {
    try {
        console.log('Starting Expediente creation test...');

        // Mock data similar to what frontend sends
        const mockData = {
            type: 'ALTA',
            client: {
                name: 'Test Client',
                nif: '12345678X',
                phone: '600000000',
                email: 'test@client.com'
            },
            installation: {
                address: 'Test Address',
                municipality: 'Test City',
                postalCode: '00000',
                cups: 'ES0021000000000000XX',
                contractedPower: 5.75,
                retailer: 'Test Retailer',
                tariff: '2.0TD',
                observations: 'Test observation'
            }
        };

        const operatorId = '96db7161-d689-4a8d-9eb1-ad4ba0d577e9' // Admin ID from seed output
        const code = `TEST-${Date.now()}`;

        console.log('Transaction starting...');

        const result = await prisma.$transaction(async (tx) => {
            // 1. Find or Create Client
            let clientRecord = await tx.client.findFirst({ where: { nif: mockData.client.nif } });

            if (!clientRecord) {
                console.log('Creating client...');
                clientRecord = await tx.client.create({
                    data: {
                        name: mockData.client.name,
                        nif: mockData.client.nif,
                        phone: mockData.client.phone,
                        email: mockData.client.email
                    }
                });
            } else {
                console.log('Client found:', clientRecord.id);
            }

            // 2. Create Installation
            console.log('Creating installation...');
            const installationRecord = await tx.installation.create({
                data: {
                    clientId: clientRecord.id,
                    address: mockData.installation.address,
                    municipality: mockData.installation.municipality,
                    postalCode: mockData.installation.postalCode,
                    cups: mockData.installation.cups,
                    contractedPower: mockData.installation.contractedPower,
                    retailer: mockData.installation.retailer,
                    tariff: mockData.installation.tariff,
                    observations: mockData.installation.observations
                }
            });

            // 3. Create Expediente
            console.log('Creating expediente...');
            const expediente = await tx.expediente.create({
                data: {
                    code,
                    type: mockData.type,
                    status: 'SIN_VISITAR', // The problematic field?
                    operatorId,
                    installationId: installationRecord.id,
                    isDeleted: false
                }
            });

            return expediente;
        });

        console.log('SUCCESS:', result);

    } catch (error: any) {
        console.error('FAILURE:', error);
        if (error.code) console.error('Error Code:', error.code);
        if (error.meta) console.error('Error Meta:', error.meta);
    } finally {
        await prisma.$disconnect();
    }
};

testCreateExpediente();
