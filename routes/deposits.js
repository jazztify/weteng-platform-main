const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Deposit = require('../models/Deposit');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { authenticate, authorize } = require('../middleware/auth');

// POST /api/deposits - Player requests a deposit
router.post('/', authenticate, authorize('player', 'kubrador', 'cabo', 'admin'), [
    body('amount').isFloat({ min: 1 }).withMessage('Amount must be at least ₱1'),
    body('method').optional().isIn(['gcash', 'maya', 'bank_transfer', 'cash', 'other'])
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { amount, method, referenceNumber, notes } = req.body;

        const deposit = await Deposit.create({
            userId: req.user._id,
            amount: parseFloat(amount),
            method: method || 'cash',
            referenceNumber: referenceNumber || '',
            notes: notes || ''
        });

        // Emit socket event for real-time notification
        const io = req.app.get('io');
        if (io) {
            io.emit('new_deposit_request', {
                depositId: deposit._id,
                userId: req.user._id,
                username: req.user.username,
                fullName: req.user.fullName,
                amount: deposit.amount,
                method: deposit.method
            });
        }

        res.status(201).json({
            success: true,
            message: 'Deposit request submitted. Waiting for approval.',
            deposit
        });
    } catch (error) {
        console.error('Deposit request error:', error);
        res.status(500).json({ success: false, message: 'Failed to create deposit request' });
    }
});

// GET /api/deposits - List deposits
router.get('/', authenticate, async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        const filter = {};

        // Players see only their own; admins/bankeros see all
        if (req.user.role === 'player' || req.user.role === 'kubrador') {
            filter.userId = req.user._id;
        }
        if (status) filter.status = status;

        const deposits = await Deposit.find(filter)
            .populate('userId', 'fullName username role')
            .populate('approvedBy', 'fullName username role')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await Deposit.countDocuments(filter);

        res.json({
            success: true,
            deposits,
            pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch deposits' });
    }
});

// PUT /api/deposits/:id/approve - Admin/Bankero approves deposit
router.put('/:id/approve', authenticate, authorize('admin', 'bankero'), async (req, res) => {
    try {
        const deposit = await Deposit.findById(req.params.id);
        if (!deposit) return res.status(404).json({ success: false, message: 'Deposit not found' });
        if (deposit.status !== 'pending') {
            return res.status(400).json({ success: false, message: 'Deposit is already ' + deposit.status });
        }

        // Update deposit status
        deposit.status = 'approved';
        deposit.approvedBy = req.user._id;
        deposit.approvedAt = new Date();
        await deposit.save();

        // Credit the user's balance
        const user = await User.findById(deposit.userId);
        const balanceBefore = user.balance;
        user.balance += deposit.amount;
        await user.save();

        // Log transaction
        await new Transaction({
            userId: deposit.userId,
            type: 'deposit',
            amount: deposit.amount,
            balanceBefore,
            balanceAfter: user.balance,
            referenceId: deposit._id,
            referenceModel: 'User',
            description: `Deposit approved via ${deposit.method} (₱${deposit.amount.toLocaleString()})`,
            status: 'completed'
        }).save();

        // Emit socket event
        const io = req.app.get('io');
        if (io) {
            io.to(deposit.userId.toString()).emit('deposit_approved', {
                depositId: deposit._id,
                amount: deposit.amount,
                newBalance: user.balance
            });
        }

        res.json({
            success: true,
            message: `Deposit of ₱${deposit.amount.toLocaleString()} approved. User balance updated.`,
            deposit
        });
    } catch (error) {
        console.error('Approve deposit error:', error);
        res.status(500).json({ success: false, message: 'Failed to approve deposit' });
    }
});

// PUT /api/deposits/:id/reject - Admin/Bankero rejects deposit  
router.put('/:id/reject', authenticate, authorize('admin', 'bankero'), async (req, res) => {
    try {
        const deposit = await Deposit.findById(req.params.id);
        if (!deposit) return res.status(404).json({ success: false, message: 'Deposit not found' });
        if (deposit.status !== 'pending') {
            return res.status(400).json({ success: false, message: 'Deposit is already ' + deposit.status });
        }

        deposit.status = 'rejected';
        deposit.rejectionReason = req.body.reason || 'Rejected by admin';
        deposit.approvedBy = req.user._id;
        deposit.approvedAt = new Date();
        await deposit.save();

        res.json({ success: true, message: 'Deposit rejected', deposit });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to reject deposit' });
    }
});

// GET /api/deposits/pending-count - count of pending deposits for badge
router.get('/pending-count', authenticate, authorize('admin', 'bankero'), async (req, res) => {
    try {
        const count = await Deposit.countDocuments({ status: 'pending' });
        res.json({ success: true, count });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to get pending count' });
    }
});

module.exports = router;
