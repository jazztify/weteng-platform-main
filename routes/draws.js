const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Draw = require('../models/Draw');
const Bet = require('../models/Bet');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { authenticate, authorize } = require('../middleware/auth');

// POST /api/draws - Create a new draw (Admin only)
router.post('/', authenticate, authorize('admin'), async (req, res) => {
    try {
        const { drawType, drawDate, scheduledTime } = req.body;

        // Check for duplicate
        const existing = await Draw.findOne({
            drawType,
            drawDate: new Date(drawDate).toISOString().split('T')[0]
        });

        if (existing) {
            return res.status(400).json({
                success: false,
                message: `${drawType} draw already exists for this date`
            });
        }

        const draw = new Draw({
            drawType,
            drawDate: new Date(drawDate),
            scheduledTime: new Date(scheduledTime),
            status: 'upcoming'
        });

        // Generate provably fair hash
        draw.generateDrawHash();
        await draw.save();

        res.status(201).json({
            success: true,
            message: 'Draw created',
            draw: {
                id: draw._id,
                drawType: draw.drawType,
                drawDate: draw.drawDate,
                scheduledTime: draw.scheduledTime,
                status: draw.status,
                drawHash: draw.drawHash,
                label: draw.label
            }
        });
    } catch (error) {
        console.error('Create draw error:', error);
        res.status(500).json({ success: false, message: 'Failed to create draw' });
    }
});

// PUT /api/draws/:id/open - Open betting for a draw
router.put('/:id/open', authenticate, authorize('admin'), async (req, res) => {
    try {
        const draw = await Draw.findById(req.params.id);
        if (!draw) return res.status(404).json({ success: false, message: 'Draw not found' });

        if (draw.status !== 'upcoming') {
            return res.status(400).json({ success: false, message: `Cannot open draw with status: ${draw.status}` });
        }

        draw.status = 'open';
        await draw.save();

        // Broadcast to all clients
        const io = req.app.get('io');
        if (io) {
            io.emit('draw_status', { drawId: draw._id, status: 'open', label: draw.label });
        }

        res.json({ success: true, message: 'Betting is now OPEN', draw });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to open draw' });
    }
});

// PUT /api/draws/:id/lock - Lock bets (LOCK_BETS event)
router.put('/:id/lock', authenticate, authorize('admin'), async (req, res) => {
    try {
        const draw = await Draw.findById(req.params.id);
        if (!draw) return res.status(404).json({ success: false, message: 'Draw not found' });

        if (draw.status !== 'open') {
            return res.status(400).json({ success: false, message: 'Can only lock an open draw' });
        }

        // Boka detection - check for heavy betting patterns
        const betAggregation = await Bet.aggregate([
            { $match: { drawId: draw._id, status: 'pending' } },
            {
                $group: {
                    _id: { num1: '$numbers.num1', num2: '$numbers.num2' },
                    count: { $sum: 1 },
                    totalAmount: { $sum: '$amount' }
                }
            },
            { $sort: { totalAmount: -1 } },
            { $limit: 10 }
        ]);

        const bokaAlerts = [];
        for (const combo of betAggregation) {
            const percentage = (combo.totalAmount / draw.totalBetAmount) * 100;
            if (percentage > 30) { // Flag if >30% of pool on one combo
                bokaAlerts.push({
                    numbers: combo._id,
                    betCount: combo.count,
                    totalAmount: combo.totalAmount,
                    percentage: Math.round(percentage * 100) / 100
                });
            }
        }

        draw.status = 'locked';
        draw.bokaAlerts = bokaAlerts;
        await draw.save();

        const io = req.app.get('io');
        if (io) {
            io.emit('LOCK_BETS', {
                drawId: draw._id,
                label: draw.label,
                totalBets: draw.totalBets,
                totalBetAmount: draw.totalBetAmount,
                bokaAlerts: bokaAlerts.length
            });
        }

        res.json({
            success: true,
            message: 'Bets LOCKED. Market is closed.',
            draw,
            bokaAlerts
        });
    } catch (error) {
        console.error('Lock draw error:', error);
        res.status(500).json({ success: false, message: 'Failed to lock draw' });
    }
});

// PUT /api/draws/:id/execute - Execute the bolahan (draw)
// Refactored: winning numbers are saved to DB BEFORE payout logic
router.put('/:id/execute', authenticate, authorize('admin'), async (req, res) => {
    try {
        // ── Step 1: Load draw ──
        const draw = await Draw.findById(req.params.id).select('+drawSeed');
        if (!draw) {
            return res.status(404).json({ success: false, message: 'Draw not found' });
        }

        if (draw.status !== 'locked') {
            return res.status(400).json({ success: false, message: 'Draw must be locked before executing' });
        }

        // ── Step 2: Generate or set winning numbers ──
        let winningNumbers;
        if (req.body?.num1 && req.body?.num2) {
            winningNumbers = {
                num1: parseInt(req.body.num1),
                num2: parseInt(req.body.num2)
            };
            draw.winningNumbers = winningNumbers;
        } else {
            winningNumbers = draw.generateWinningNumbers();
        }

        draw.status = 'drawn';
        draw.drawnBy = req.user._id;
        draw.drawnAt = new Date();

        // ── Step 3: SAVE winning numbers to DB BEFORE payout ──
        await draw.save();
        console.log('[EXECUTE] Draw saved with status:', draw.status);

        // ── Step 4: Find winning bets (order doesn't matter) ──
        const winningBets = await Bet.find({
            drawId: draw._id,
            status: 'pending',
            $or: [
                { 'numbers.num1': winningNumbers.num1, 'numbers.num2': winningNumbers.num2 },
                { 'numbers.num1': winningNumbers.num2, 'numbers.num2': winningNumbers.num1 }
            ]
        }).populate('kubradorId', 'fullName username');

        let totalPayout = 0;
        const totalWinners = winningBets.length;

        // ── Step 5: Process winning bets & credit kubradors ──
        for (const bet of winningBets) {
            bet.status = 'won';
            bet.actualPayout = bet.potentialPayout;
            totalPayout += bet.potentialPayout;
            await bet.save();

            // Credit the kubrador's balance for the winnings
            const kubrador = await User.findById(bet.kubradorId._id || bet.kubradorId);
            if (kubrador) {
                const balBefore = kubrador.balance;
                kubrador.balance += bet.potentialPayout;
                await kubrador.save();

                await new Transaction({
                    userId: kubrador._id,
                    type: 'payout',
                    amount: bet.potentialPayout,
                    balanceBefore: balBefore,
                    balanceAfter: kubrador.balance,
                    referenceId: bet._id,
                    referenceModel: 'Bet',
                    description: `Winning payout for ${bet.papelito} (${winningNumbers.num1}-${winningNumbers.num2})`
                }).save();
            }
        }

        // ── Step 6: Mark losing bets ──
        await Bet.updateMany(
            { drawId: draw._id, status: 'pending' },
            { status: 'lost' }
        );

        // ── Step 7: Finalize draw settlement ──
        draw.totalPayout = totalPayout;
        draw.totalWinners = totalWinners;
        draw.status = 'settled';
        draw.settledAt = new Date();
        await draw.save();

        // ── Step 8: Broadcast results via Socket.io ──
        const io = req.app.get('io');
        if (io) {
            io.emit('DRAW_RESULT', {
                drawId: draw._id,
                label: draw.label,
                winningNumbers,
                totalWinners,
                totalPayout,
                drawHash: draw.drawHash
            });
        }

        res.json({
            success: true,
            message: `Draw completed! ${totalWinners} winner(s). Total payout: ₱${totalPayout.toLocaleString()}`,
            result: {
                drawId: draw._id,
                label: draw.label,
                winningNumbers,
                totalBets: draw.totalBets,
                totalBetAmount: draw.totalBetAmount,
                totalWinners,
                totalPayout,
                drawHash: draw.drawHash,
                drawnAt: draw.drawnAt,
                settledAt: draw.settledAt
            }
        });
    } catch (error) {
        console.error('Execute draw error:', error.message);
        res.status(500).json({ success: false, message: error.message || 'Failed to execute draw' });
    }
});

// GET /api/draws - List draws
router.get('/', authenticate, async (req, res) => {
    try {
        const { status, page = 1, limit = 20, date } = req.query;
        const filter = {};

        if (status) filter.status = status;
        if (date) {
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);
            filter.drawDate = { $gte: startOfDay, $lte: endOfDay };
        }

        const draws = await Draw.find(filter)
            .populate('drawnBy', 'fullName username')
            .sort({ drawDate: -1, scheduledTime: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await Draw.countDocuments(filter);

        res.json({
            success: true,
            draws,
            pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch draws' });
    }
});

// GET /api/draws/active - Get current active draws
router.get('/active', authenticate, async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const draws = await Draw.find({
            drawDate: { $gte: today, $lt: tomorrow },
            status: { $in: ['upcoming', 'open', 'locked'] }
        }).sort({ scheduledTime: 1 });

        res.json({ success: true, draws });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch active draws' });
    }
});

// GET /api/draws/:id/winners - Get winners for a specific draw (War Room)
router.get('/:id/winners', authenticate, authorize('admin'), async (req, res) => {
    try {
        const draw = await Draw.findById(req.params.id);
        if (!draw) {
            return res.status(404).json({ success: false, message: 'Draw not found' });
        }

        const winningBets = await Bet.find({
            drawId: draw._id,
            status: 'won'
        }).populate('kubradorId', 'fullName username');

        const winners = winningBets.map(bet => ({
            bettorName: bet.bettorName || 'Walk-in',
            kubradorName: bet.kubradorId?.fullName || 'Unknown',
            numbers: `${bet.numbers.num1}-${bet.numbers.num2}`,
            betAmount: bet.amount,
            payout: bet.actualPayout,
            papelito: bet.papelito,
            isPompyang: bet.isPompyang
        }));

        res.json({
            success: true,
            drawId: draw._id,
            label: draw.label,
            winningNumbers: draw.winningNumbers,
            totalWinners: winners.length,
            totalPayout: draw.totalPayout || 0,
            winners
        });
    } catch (error) {
        console.error('Get winners error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch winners' });
    }
});

// GET /api/draws/:id
router.get('/:id', authenticate, async (req, res) => {
    try {
        const draw = await Draw.findById(req.params.id).populate('drawnBy', 'fullName');
        if (!draw) return res.status(404).json({ success: false, message: 'Draw not found' });
        res.json({ success: true, draw });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch draw' });
    }
});

module.exports = router;
