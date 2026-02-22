const mongoose = require('mongoose');

const depositSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    amount: {
        type: Number,
        required: true,
        min: 1
    },
    method: {
        type: String,
        enum: ['gcash', 'maya', 'bank_transfer', 'cash', 'other'],
        default: 'cash'
    },
    referenceNumber: {
        type: String,
        trim: true,
        default: ''
    },
    notes: {
        type: String,
        trim: true,
        default: ''
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending'
    },
    approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    approvedAt: {
        type: Date,
        default: null
    },
    rejectionReason: {
        type: String,
        trim: true,
        default: ''
    }
}, {
    timestamps: true
});

depositSchema.index({ userId: 1, status: 1 });
depositSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Deposit', depositSchema);
