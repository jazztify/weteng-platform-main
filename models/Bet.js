const mongoose = require('mongoose');

const betSchema = new mongoose.Schema({
    // Bettor info (can be walk-in via Kubrador)
    bettorName: {
        type: String,
        default: 'Walk-in'
    },
    // Kubrador who collected the bet
    kubradorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // Cabo overseeing the kubrador
    caboId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    // Associated draw
    drawId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Draw',
        required: true
    },
    // The two numbers selected (1-37)
    numbers: {
        num1: {
            type: Number,
            required: true,
            min: 1,
            max: 37
        },
        num2: {
            type: Number,
            required: true,
            min: 1,
            max: 37
        }
    },
    // Bet amount in PHP
    amount: {
        type: Number,
        required: true,
        min: 1
    },
    // Whether this is a pompyang (identical numbers)
    isPompyang: {
        type: Boolean,
        default: false
    },
    // Potential payout (calculated)
    potentialPayout: {
        type: Number,
        default: 0
    },
    // Actual payout (set after draw)
    actualPayout: {
        type: Number,
        default: 0
    },
    // Status
    status: {
        type: String,
        enum: ['pending', 'won', 'lost', 'cancelled', 'void'],
        default: 'pending'
    },
    // Commission breakdown
    commissions: {
        kubrador: { type: Number, default: 0 },
        cabo: { type: Number, default: 0 },
        bankero: { type: Number, default: 0 }
    },
    // Digital papelito reference
    papelito: {
        type: String,
        unique: true
    },
    // Offline sync flag
    syncedFromOffline: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Generate papelito reference before saving
betSchema.pre('save', async function () {
    if (!this.papelito) {
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 6).toUpperCase();
        this.papelito = `WTG-${timestamp}-${random}`;
    }

    // Check for pompyang
    this.isPompyang = this.numbers.num1 === this.numbers.num2;

    const GlobalSettings = mongoose.model('GlobalSettings');
    const User = mongoose.model('User');

    let settings = await GlobalSettings.findOne();
    if (!settings) {
        settings = { payoutMultiplier: 400, pompyangMultiplier: 800 };
    }

    // Calculate potential payout dynamically
    const payoutMultiplier = this.isPompyang ? settings.pompyangMultiplier : settings.payoutMultiplier;
    this.potentialPayout = this.amount * payoutMultiplier;

    // Fetch dynamic commission rates from User hierarchy
    let kRate = 0.15;
    let cRate = 0.07;
    let bRate = 0.25;

    if (this.kubradorId) {
        const kubrador = await User.findById(this.kubradorId).populate('parentId');
        if (kubrador) {
            kRate = kubrador.commissionRate ?? 0.15;
            const cabo = kubrador.parentId;
            if (cabo) {
                cRate = cabo.commissionRate ?? 0.07;
                if (cabo.parentId) {
                    const bankero = await User.findById(cabo.parentId);
                    if (bankero) {
                        bRate = bankero.commissionRate ?? 0.25;
                    }
                }
            }
        }
    }

    // Calculate commissions
    this.commissions.kubrador = this.amount * kRate;
    this.commissions.cabo = this.amount * cRate;
    this.commissions.bankero = this.amount * bRate;
});

// Indexes
betSchema.index({ drawId: 1, status: 1 });
betSchema.index({ kubradorId: 1, createdAt: -1 });
betSchema.index({ 'numbers.num1': 1, 'numbers.num2': 1 });

module.exports = mongoose.model('Bet', betSchema);
