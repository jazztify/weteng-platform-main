const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Draw = require('./models/Draw');

dotenv.config();

const seedDatabase = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/weteng_platform');
        console.log('✅ Connected to MongoDB');

        // Clear existing data
        await User.deleteMany({});
        await Draw.deleteMany({});

        // Clear new collections if they exist
        try {
            await mongoose.connection.db.collection('deposits').deleteMany({});
            await mongoose.connection.db.collection('remittances').deleteMany({});
        } catch (e) { /* collections may not exist yet */ }

        console.log('🗑️ Cleared existing data');

        // Create Admin
        const admin = await User.create({
            username: 'admin',
            email: 'admin@weteng.ph',
            password: 'admin123',
            fullName: 'System Administrator',
            role: 'admin',
            phone: '+63-917-000-0001',
            balance: 0
        });
        console.log('👑 Admin created');

        // Create Bankero
        const bankero = await User.create({
            username: 'bankero1',
            email: 'bankero@weteng.ph',
            password: 'bankero123',
            fullName: 'Don Ricardo Gonzales',
            role: 'bankero',
            phone: '+63-917-000-0002',
            bankroll: 500000,
            balance: 500000
        });
        console.log('💰 Bankero created');

        // Create Cabos (parent = Bankero)
        const cabo1 = await User.create({
            username: 'cabo1',
            email: 'cabo1@weteng.ph',
            password: 'cabo123',
            fullName: 'Juan Dela Cruz',
            role: 'cabo',
            phone: '+63-917-000-0003',
            parentId: bankero._id,
            cell: 'Manila North',
            balance: 5000
        });

        const cabo2 = await User.create({
            username: 'cabo2',
            email: 'cabo2@weteng.ph',
            password: 'cabo123',
            fullName: 'Maria Santos',
            role: 'cabo',
            phone: '+63-917-000-0004',
            parentId: bankero._id,
            cell: 'Manila South',
            balance: 3500
        });
        console.log('📋 Cabos created (→ Bankero)');

        // Create Kubradors (parent = Cabo)
        const kubra1 = await User.create({
            username: 'kubra1',
            email: 'kubra1@weteng.ph',
            password: 'kubra123',
            fullName: 'Pedro Reyes',
            role: 'kubrador',
            phone: '+63-917-000-0005',
            parentId: cabo1._id,
            balance: 750
        });

        await User.create({
            username: 'kubra2',
            email: 'kubra2@weteng.ph',
            password: 'kubra123',
            fullName: 'Rosa Flores',
            role: 'kubrador',
            phone: '+63-917-000-0006',
            parentId: cabo1._id,
            balance: 1200
        });

        await User.create({
            username: 'kubra3',
            email: 'kubra3@weteng.ph',
            password: 'kubra123',
            fullName: 'Miguel Torres',
            role: 'kubrador',
            phone: '+63-917-000-0007',
            parentId: cabo2._id,
            balance: 900
        });
        console.log('🏃 Kubradors created (→ Cabo)');

        // Create Players (independent or linked to Kubrador)
        await User.create({
            username: 'player1',
            email: 'player1@weteng.ph',
            password: 'player123',
            fullName: 'Carlos Betguy',
            role: 'player',
            phone: '+63-917-000-0010',
            parentId: kubra1._id,
            balance: 500
        });

        await User.create({
            username: 'player2',
            email: 'player2@weteng.ph',
            password: 'player123',
            fullName: 'Ana Magpusta',
            role: 'player',
            phone: '+63-917-000-0011',
            balance: 200
        });
        console.log('🎮 Players created');

        // Create today's draws
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const morningDraw = new Draw({
            drawType: 'morning',
            drawDate: today,
            scheduledTime: new Date(today.getTime() + 11 * 60 * 60 * 1000),
            status: 'open'
        });
        morningDraw.generateDrawHash();
        await morningDraw.save();

        const noonDraw = new Draw({
            drawType: 'noon',
            drawDate: today,
            scheduledTime: new Date(today.getTime() + 14 * 60 * 60 * 1000),
            status: 'upcoming'
        });
        noonDraw.generateDrawHash();
        await noonDraw.save();

        const afternoonDraw = new Draw({
            drawType: 'afternoon',
            drawDate: today,
            scheduledTime: new Date(today.getTime() + 17 * 60 * 60 * 1000),
            status: 'upcoming'
        });
        afternoonDraw.generateDrawHash();
        await afternoonDraw.save();

        console.log('🎰 Today\'s draws created');

        console.log('\n========================================');
        console.log('  🎰 WETENG PLATFORM - SEED COMPLETE');
        console.log('========================================');
        console.log('');
        console.log('  LOGIN CREDENTIALS:');
        console.log('  ------------------');
        console.log('  Admin:    admin / admin123');
        console.log('  Bankero:  bankero1 / bankero123');
        console.log('  Cabo:     cabo1 / cabo123');
        console.log('  Cabo:     cabo2 / cabo123');
        console.log('  Kubrador: kubra1 / kubra123');
        console.log('  Kubrador: kubra2 / kubra123');
        console.log('  Kubrador: kubra3 / kubra123');
        console.log('  Player:   player1 / player123');
        console.log('  Player:   player2 / player123');
        console.log('');
        console.log('  HIERARCHY:');
        console.log('  Bankero → Cabo1 → Kubra1, Kubra2');
        console.log('  Bankero → Cabo2 → Kubra3');
        console.log('  Kubra1 → Player1');
        console.log('  Player2 (independent)');
        console.log('========================================\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ Seed error:', error);
        process.exit(1);
    }
};

seedDatabase();
