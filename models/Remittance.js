const mongoose = require('mongoose');

const remittanceSchema = new mongoose.Schema({
    // Kubrador who submits the remittance
    submittedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // The Cabo receiving / verifying the remittance
    caboId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // The Bankero who ultimately receives the funds
    bankeroId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // Total collection amount for the day
    totalCollections: {
        type: Number,
        required: true,
        min: 0
    },
    // Commission deducted (kubrador keeps this)
    kubradorCommission: {
        type: Number,
        default: 0
    },
    // Commission for the cabo
    caboCommission: {
        type: Number,
        default: 0
    },
    // Net amount sent up to Bankero
    netAmount: {
        type: Number,
        required: true,
        min: 0
    },
    // Date this remittance covers
    remittanceDate: {
        type: Date,
        required: true
    },
    // Status flow: kubrador submits → cabo verifies → bankero receives
    status: {
        type: String,
        enum: ['submitted', 'verified', 'received', 'rejected'],
        default: 'submitted'
    },
    // Cabo verification
    verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    verifiedAt: {
        type: Date,
        default: null
    },
    // Notes
    notes: {
        type: String,
        trim: true,
        default: ''
    },
    rejectionReason: {
        type: String,
        trim: true,
        default: ''
    }
}, {
    timestamps: true
});

remittanceSchema.index({ submittedBy: 1, remittanceDate: -1 });
remittanceSchema.index({ caboId: 1, status: 1 });
remittanceSchema.index({ bankeroId: 1, status: 1 });

module.exports = mongoose.model('Remittance', remittanceSchema);
