const mongoose = require('mongoose');
const crypto = require('crypto');

const drawSchema = new mongoose.Schema({
    // Draw schedule type
    drawType: {
        type: String,
        enum: ['morning', 'noon', 'afternoon'],
        required: true
    },
    // Draw date
    drawDate: {
        type: Date,
        required: true
    },
    // Scheduled time
    scheduledTime: {
        type: Date,
        required: true
    },
    // Winning numbers
    winningNumbers: {
        num1: { type: Number, min: 1, max: 37 },
        num2: { type: Number, min: 1, max: 37 }
    },
    // Draw status
    status: {
        type: String,
        enum: ['upcoming', 'open', 'locked', 'drawn', 'settled', 'cancelled'],
        default: 'upcoming'
    },
    // Provably fair - pre-draw hash
    drawHash: {
        type: String
    },
    drawSeed: {
        type: String,
        select: false
    },
    // Financial summary
    totalBets: {
        type: Number,
        default: 0
    },
    totalBetAmount: {
        type: Number,
        default: 0
    },
    totalPayout: {
        type: Number,
        default: 0
    },
    totalWinners: {
        type: Number,
        default: 0
    },
    // Boka detection flag
    bokaAlerts: [{
        numbers: {
            num1: Number,
            num2: Number
        },
        betCount: Number,
        totalAmount: Number,
        percentage: Number,
        flaggedAt: { type: Date, default: Date.now }
    }],
    // Who initiated the draw
    drawnBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    drawnAt: {
        type: Date
    },
    settledAt: {
        type: Date
    },
    // Draw label for display
    label: {
        type: String
    }
}, {
    timestamps: true
});

// Generate label before saving
drawSchema.pre('save', function () {
    if (!this.label) {
        const dateStr = this.drawDate.toLocaleDateString('en-PH', {
            month: 'short', day: 'numeric', year: 'numeric'
        });
        const typeLabel = this.drawType.charAt(0).toUpperCase() + this.drawType.slice(1);
        this.label = `${typeLabel} Draw - ${dateStr}`;
    }
});

// Generate provably fair hash
drawSchema.methods.generateDrawHash = function () {
    this.drawSeed = crypto.randomBytes(32).toString('hex');
    this.drawHash = crypto
        .createHash('sha256')
        .update(this.drawSeed)
        .digest('hex');
    return this.drawHash;
};

// Generate winning numbers using cryptographic RNG
drawSchema.methods.generateWinningNumbers = function () {
    const buf1 = crypto.randomBytes(4);
    const buf2 = crypto.randomBytes(4);
    const num1 = (buf1.readUInt32BE(0) % 37) + 1;
    const num2 = (buf2.readUInt32BE(0) % 37) + 1;
    this.winningNumbers = { num1, num2 };
    return this.winningNumbers;
};

// Indexes
drawSchema.index({ drawDate: 1, drawType: 1 }, { unique: true });
drawSchema.index({ status: 1 });

module.exports = mongoose.model('Draw', drawSchema);
