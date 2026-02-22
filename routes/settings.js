const express = require('express');
const router = express.Router();
const GlobalSettings = require('../models/GlobalSettings');
const { authenticate, authorize } = require('../middleware/auth');

// GET /api/settings - Public or authenticated
router.get('/', async (req, res) => {
    try {
        let settings = await GlobalSettings.findOne();
        if (!settings) {
            settings = new GlobalSettings();
            await settings.save();
        }
        res.json({ success: true, settings });
    } catch (error) {
        console.error('Fetch settings error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// PUT /api/settings - Admin only
router.put('/', authenticate, authorize('admin'), async (req, res) => {
    try {
        const { maxNumber, payoutMultiplier, pompyangMultiplier, drawSchedule } = req.body;

        let settings = await GlobalSettings.findOne();
        if (!settings) {
            settings = new GlobalSettings();
        }

        if (maxNumber) settings.maxNumber = maxNumber;
        if (payoutMultiplier) settings.payoutMultiplier = payoutMultiplier;
        if (pompyangMultiplier) settings.pompyangMultiplier = pompyangMultiplier;
        if (drawSchedule) settings.drawSchedule = drawSchedule;

        await settings.save();

        // Broadcast to all clients
        const io = req.app.get('io');
        if (io) {
            io.emit('SETTINGS_UPDATED', settings);
        }

        res.json({ success: true, message: 'Settings updated successfully', settings });
    } catch (error) {
        console.error('Update settings error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
