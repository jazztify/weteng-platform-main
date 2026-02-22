const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { authenticate, authorize } = require('../middleware/auth');

// POST /api/transactions/deposit - Player requests a deposit
router.post('/deposit', authenticate, async (req, res) => {
    try {
        const { amount, referenceNumber, paymentMethod } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ success: false, message: 'Invalid amount' });
        }

        const transaction = new Transaction({
            userId: req.user._id,
            amount,
            referenceNumber,
            paymentMethod: paymentMethod || 'Cash',
            type: 'deposit',
            status: 'Pending',
            description: `Deposit request via ${paymentMethod || 'Cash'}`
        });

        await transaction.save();

        res.status(201).json({
            success: true,
            message: 'Deposit request submitted and is now pending approval.',
            transaction
        });
    } catch (error) {
        console.error('Deposit error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// GET /api/transactions/pending - Admin sees pending deposits
router.get('/pending', authenticate, authorize('admin'), async (req, res) => {
    try {
        const transactions = await Transaction.find({ status: 'Pending', type: 'deposit' })
            .populate('userId', 'username fullName role balance')
            .sort({ createdAt: -1 });

        res.json({ success: true, transactions });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// PUT /api/transactions/:id/approve - Admin approves deposit
router.put('/:id/approve', authenticate, authorize('admin'), async (req, res) => {
    try {
        const transaction = await Transaction.findById(req.params.id);

        if (!transaction) {
            return res.status(404).json({ success: false, message: 'Transaction not found' });
        }

        if (transaction.status !== 'Pending') {
            return res.status(400).json({ success: false, message: 'Transaction is already processed' });
        }

        const user = await User.findById(transaction.userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Apply atomic update for balance increase
        const balanceBefore = user.balance;
        const updatedUser = await User.findByIdAndUpdate(
            user._id,
            { $inc: { balance: transaction.amount } },
            { new: true }
        );

        // Update transaction status
        transaction.status = 'Approved';
        transaction.balanceBefore = balanceBefore;
        transaction.balanceAfter = updatedUser.balance;
        transaction.processedBy = req.user._id;
        transaction.processedAt = new Date();
        await transaction.save();

        // Emit socket event for real-time balance update if player is online
        const io = req.app.get('io');
        if (io) {
            io.to(user._id.toString()).emit('balance_updated', {
                amount: transaction.amount,
                newBalance: updatedUser.balance,
                type: 'deposit_approved'
            });
        }

        res.json({
            success: true,
            message: 'Transaction approved and balance updated.',
            transaction
        });
    } catch (error) {
        console.error('Approval error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// PUT /api/transactions/:id/reject - Admin rejects deposit
router.put('/:id/reject', authenticate, authorize('admin'), async (req, res) => {
    try {
        const transaction = await Transaction.findById(req.params.id);

        if (!transaction) {
            return res.status(404).json({ success: false, message: 'Transaction not found' });
        }

        transaction.status = 'Rejected';
        transaction.processedBy = req.user._id;
        transaction.processedAt = new Date();
        await transaction.save();

        res.json({ success: true, message: 'Transaction rejected.' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
