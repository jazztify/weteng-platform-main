const mongoose = require('mongoose');

const globalSettingsSchema = new mongoose.Schema({
    maxNumber: {
        type: Number,
        default: 37,
        required: true,
        min: 1
    },
    payoutMultiplier: {
        type: Number,
        default: 400,
        required: true,
        min: 1
    },
    pompyangMultiplier: {
        type: Number,
        default: 800,
        required: true,
        min: 1
    },
    drawSchedule: {
        type: [String],
        default: ['11:00 AM', '04:00 PM', '09:00 PM'],
        required: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('GlobalSettings', globalSettingsSchema);
