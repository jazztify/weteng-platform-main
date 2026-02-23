const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const Bet = require('../models/Bet');
const Draw = require('../models/Draw');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const GlobalSettings = require('../models/GlobalSettings');
const { authenticate, authorize } = require('../middleware/auth');

// POST /api/bets - Place a bet (Kubrador)
router.post('/', authenticate, authorize('kubrador', 'cabo', 'admin'), [
    body('num1').isInt({ min: 1 }).withMessage('Number 1 must be properly selected'),
    body('num2').isInt({ min: 1 }).withMessage('Number 2 must be properly selected'),
    body('amount').isFloat({ min: 1 }).withMessage('Bet amount must be at least ₱1'),
    body('drawId').notEmpty().withMessage('Draw ID is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { num1, num2, amount, drawId, bettorName, syncedFromOffline } = req.body;

        let settings = await GlobalSettings.findOne();
        if (!settings) settings = { maxNumber: 37 };

        if (num1 > settings.maxNumber || num2 > settings.maxNumber) {
            return res.status(400).json({ success: false, message: `Numbers must be between 1 and ${settings.maxNumber}` });
        }

        // Verify draw is open
        const draw = await Draw.findById(drawId);
        if (!draw) {
            return res.status(404).json({ success: false, message: 'Draw not found' });
        }

        if (draw.status !== 'open') {
            return res.status(400).json({
                success: false,
                message: `Betting is ${draw.status}. Cannot place bets at this time.`
            });
        }

        // Find cabo (parent of kubrador)
        const kubrador = await User.findById(req.user._id);
        const caboId = kubrador.parentId || null;

        // Create bet
        const bet = new Bet({
            kubradorId: req.user._id,
            caboId,
            drawId,
            numbers: { num1: parseInt(num1), num2: parseInt(num2) },
            amount: parseFloat(amount),
            bettorName: bettorName || 'Walk-in',
            syncedFromOffline: syncedFromOffline || false
        });

        await bet.save();

        // Update draw totals
        draw.totalBets += 1;
        draw.totalBetAmount += parseFloat(amount);
        await draw.save();

        // Update kubrador collections
        kubrador.totalCollections += parseFloat(amount);
        kubrador.totalCommissions += bet.commissions.kubrador;
        kubrador.balance += bet.commissions.kubrador;
        await kubrador.save();

        // Create commission transaction
        await new Transaction({
            userId: req.user._id,
            type: 'commission',
            amount: bet.commissions.kubrador,
            balanceBefore: kubrador.balance - bet.commissions.kubrador,
            balanceAfter: kubrador.balance,
            referenceId: bet._id,
            referenceModel: 'Bet',
            description: `Commission for bet ${bet.papelito}`
        }).save();

        // Emit real-time update
        const io = req.app.get('io');
        if (io) {
            io.emit('new_bet', {
                drawId,
                totalBets: draw.totalBets,
                totalBetAmount: draw.totalBetAmount,
                papelito: bet.papelito
            });
        }

        res.status(201).json({
            success: true,
            message: 'Bet placed successfully',
            bet: {
                id: bet._id,
                papelito: bet.papelito,
                numbers: bet.numbers,
                amount: bet.amount,
                isPompyang: bet.isPompyang,
                potentialPayout: bet.potentialPayout,
                commission: bet.commissions.kubrador,
                status: bet.status
            }
        });
    } catch (error) {
        console.error('Place bet error:', error);
        res.status(500).json({ success: false, message: 'Failed to place bet' });
    }
});

// POST /api/bets/batch - Batch sync offline bets
router.post('/batch', authenticate, authorize('kubrador'), async (req, res) => {
    try {
        const { bets } = req.body;
        if (!Array.isArray(bets) || bets.length === 0) {
            return res.status(400).json({ success: false, message: 'No bets to sync' });
        }

        const results = [];
        for (const betData of bets) {
            try {
                const bet = new Bet({
                    kubradorId: req.user._id,
                    caboId: req.user.parentId,
                    drawId: betData.drawId,
                    numbers: { num1: betData.num1, num2: betData.num2 },
                    amount: betData.amount,
                    bettorName: betData.bettorName || 'Walk-in',
                    syncedFromOffline: true
                });
                await bet.save();
                results.push({ success: true, papelito: bet.papelito });
            } catch (err) {
                results.push({ success: false, error: err.message });
            }
        }

        res.json({ success: true, message: `Synced ${results.filter(r => r.success).length}/${bets.length} bets`, results });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Batch sync failed' });
    }
});

// GET /api/bets - Get bets with filters
router.get('/', authenticate, async (req, res) => {
    try {
        const { drawId, status, page = 1, limit = 50, search } = req.query;
        const filter = {};

        // Role-based filtering
        if (req.user.role === 'kubrador') {
            filter.kubradorId = req.user._id;
        } else if (req.user.role === 'cabo') {
            filter.caboId = req.user._id;
        }

        if (drawId) filter.drawId = drawId;
        if (status) filter.status = status;

        if (search) {
            filter.$or = [
                { papelito: { $regex: search, $options: 'i' } },
                { bettorName: { $regex: search, $options: 'i' } }
            ];
        }

        const bets = await Bet.find(filter)
            .populate('kubradorId', 'fullName username')
            .populate('drawId', 'drawType drawDate label')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await Bet.countDocuments(filter);

        res.json({
            success: true,
            bets,
            pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch bets' });
    }
});

// GET /api/bets/:id
router.get('/:id', authenticate, async (req, res) => {
    try {
        const bet = await Bet.findById(req.params.id)
            .populate('kubradorId', 'fullName username')
            .populate('caboId', 'fullName username')
            .populate('drawId');

        if (!bet) {
            return res.status(404).json({ success: false, message: 'Bet not found' });
        }

        res.json({ success: true, bet });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch bet' });
    }
});

// PUT /api/bets/:id/cancel - Cancel a bet
router.put('/:id/cancel', authenticate, authorize('admin', 'bankero', 'cabo'), async (req, res) => {
    try {
        const bet = await Bet.findById(req.params.id);
        if (!bet) return res.status(404).json({ success: false, message: 'Bet not found' });
        if (bet.status !== 'pending') {
            return res.status(400).json({ success: false, message: 'Can only cancel pending bets' });
        }

        bet.status = 'cancelled';
        await bet.save();

        const draw = await Draw.findById(bet.drawId);
        if (draw) {
            draw.totalBets -= 1;
            draw.totalBetAmount -= bet.amount;
            await draw.save();
        }

        res.json({ success: true, message: 'Bet cancelled', bet });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to cancel bet' });
    }
});

module.exports = router;
