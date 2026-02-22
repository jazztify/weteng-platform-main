const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Remittance = require('../models/Remittance');
const Bet = require('../models/Bet');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { authenticate, authorize } = require('../middleware/auth');

// POST /api/remittances - Kubrador submits daily remittance to Cabo
router.post('/', authenticate, authorize('kubrador'), [
    body('notes').optional().isString()
], async (req, res) => {
    try {
        const kubrador = await User.findById(req.user._id);
        if (!kubrador.parentId) {
            return res.status(400).json({ success: false, message: 'You are not assigned to a Cabo. Contact admin.' });
        }

        // Get cabo and bankero from hierarchy
        const cabo = await User.findById(kubrador.parentId);
        if (!cabo || cabo.role !== 'cabo') {
            return res.status(400).json({ success: false, message: 'Your assigned parent is not a valid Cabo.' });
        }

        const bankero = cabo.parentId ? await User.findById(cabo.parentId) : null;
        if (!bankero || bankero.role !== 'bankero') {
            return res.status(400).json({ success: false, message: 'Your Cabo is not assigned to a Bankero.' });
        }

        // Calculate today's collections for this kubrador
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Check if a remittance already exists for today
        const existingRemittance = await Remittance.findOne({
            submittedBy: req.user._id,
            remittanceDate: { $gte: today, $lt: tomorrow }
        });

        if (existingRemittance) {
            return res.status(400).json({
                success: false,
                message: 'You already submitted a remittance for today.',
                remittance: existingRemittance
            });
        }

        const collectionsAgg = await Bet.aggregate([
            {
                $match: {
                    kubradorId: req.user._id,
                    createdAt: { $gte: today, $lt: tomorrow },
                    status: { $ne: 'cancelled' }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: '$amount' },
                    count: { $sum: 1 }
                }
            }
        ]);

        const totalCollections = collectionsAgg[0]?.total || 0;
        if (totalCollections === 0) {
            return res.status(400).json({ success: false, message: 'No collections for today. Nothing to remit.' });
        }

        const kubradorCommission = totalCollections * kubrador.commissionRate;
        const caboCommission = totalCollections * cabo.commissionRate;
        const netAmount = totalCollections - kubradorCommission - caboCommission;

        const remittance = await Remittance.create({
            submittedBy: req.user._id,
            caboId: cabo._id,
            bankeroId: bankero._id,
            totalCollections,
            kubradorCommission,
            caboCommission,
            netAmount,
            remittanceDate: today,
            notes: req.body.notes || ''
        });

        // Emit socket event
        const io = req.app.get('io');
        if (io) {
            io.emit('new_remittance', {
                remittanceId: remittance._id,
                kubradorName: kubrador.fullName,
                caboId: cabo._id.toString(),
                totalCollections,
                netAmount
            });
        }

        res.status(201).json({
            success: true,
            message: `Remittance of ₱${totalCollections.toLocaleString()} submitted to ${cabo.fullName}`,
            remittance
        });
    } catch (error) {
        console.error('Submit remittance error:', error);
        res.status(500).json({ success: false, message: 'Failed to submit remittance' });
    }
});

// GET /api/remittances - List remittances based on role
router.get('/', authenticate, async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        const filter = {};

        if (req.user.role === 'kubrador') {
            filter.submittedBy = req.user._id;
        } else if (req.user.role === 'cabo') {
            filter.caboId = req.user._id;
        } else if (req.user.role === 'bankero') {
            filter.bankeroId = req.user._id;
        }
        // admin sees all

        if (status) filter.status = status;

        const remittances = await Remittance.find(filter)
            .populate('submittedBy', 'fullName username role')
            .populate('caboId', 'fullName username')
            .populate('bankeroId', 'fullName username')
            .populate('verifiedBy', 'fullName username')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await Remittance.countDocuments(filter);

        res.json({
            success: true,
            remittances,
            pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch remittances' });
    }
});

// PUT /api/remittances/:id/verify - Cabo verifies and sends funds up to Bankero
router.put('/:id/verify', authenticate, authorize('cabo', 'admin'), async (req, res) => {
    try {
        const remittance = await Remittance.findById(req.params.id);
        if (!remittance) return res.status(404).json({ success: false, message: 'Remittance not found' });

        if (remittance.status !== 'submitted') {
            return res.status(400).json({ success: false, message: 'Remittance is already ' + remittance.status });
        }

        // Only the assigned cabo (or admin) can verify
        if (req.user.role === 'cabo' && remittance.caboId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'You are not the assigned Cabo for this remittance.' });
        }

        // Update remittance status
        remittance.status = 'verified';
        remittance.verifiedBy = req.user._id;
        remittance.verifiedAt = new Date();
        await remittance.save();

        // Credit cabo's commission to cabo balance
        const cabo = await User.findById(remittance.caboId);
        if (cabo) {
            const caboBefore = cabo.balance;
            cabo.balance += remittance.caboCommission;
            cabo.totalCommissions += remittance.caboCommission;
            cabo.totalCollections += remittance.totalCollections;
            await cabo.save();

            await new Transaction({
                userId: cabo._id,
                type: 'commission',
                amount: remittance.caboCommission,
                balanceBefore: caboBefore,
                balanceAfter: cabo.balance,
                referenceId: remittance._id,
                referenceModel: 'User',
                description: `Cabo commission from remittance (₱${remittance.totalCollections.toLocaleString()})`,
                status: 'completed'
            }).save();
        }

        // Credit net amount to bankero balance
        const bankero = await User.findById(remittance.bankeroId);
        if (bankero) {
            const bankeroBefore = bankero.balance;
            bankero.balance += remittance.netAmount;
            bankero.totalCollections += remittance.netAmount;
            await bankero.save();

            await new Transaction({
                userId: bankero._id,
                type: 'remittance',
                amount: remittance.netAmount,
                balanceBefore: bankeroBefore,
                balanceAfter: bankero.balance,
                referenceId: remittance._id,
                referenceModel: 'User',
                description: `Remittance from ${cabo ? cabo.fullName : 'Cabo'} (₱${remittance.netAmount.toLocaleString()})`,
                status: 'completed'
            }).save();
        }

        // Create remittance transaction for kubrador
        const kubrador = await User.findById(remittance.submittedBy);
        if (kubrador) {
            await new Transaction({
                userId: kubrador._id,
                type: 'remittance',
                amount: -remittance.totalCollections + remittance.kubradorCommission,
                balanceBefore: kubrador.balance,
                balanceAfter: kubrador.balance,
                referenceId: remittance._id,
                referenceModel: 'User',
                description: `Remittance submitted & verified (kept ₱${remittance.kubradorCommission.toLocaleString()} commission)`,
                status: 'completed'
            }).save();
        }

        // Emit socket event
        const io = req.app.get('io');
        if (io) {
            io.emit('remittance_verified', {
                remittanceId: remittance._id,
                bankeroId: remittance.bankeroId.toString(),
                netAmount: remittance.netAmount
            });
        }

        res.json({
            success: true,
            message: `Remittance verified. ₱${remittance.netAmount.toLocaleString()} sent to Bankero.`,
            remittance
        });
    } catch (error) {
        console.error('Verify remittance error:', error);
        res.status(500).json({ success: false, message: 'Failed to verify remittance' });
    }
});

// PUT /api/remittances/:id/reject - Cabo rejects remittance
router.put('/:id/reject', authenticate, authorize('cabo', 'admin'), async (req, res) => {
    try {
        const remittance = await Remittance.findById(req.params.id);
        if (!remittance) return res.status(404).json({ success: false, message: 'Remittance not found' });

        if (remittance.status !== 'submitted') {
            return res.status(400).json({ success: false, message: 'Remittance is already ' + remittance.status });
        }

        remittance.status = 'rejected';
        remittance.rejectionReason = req.body.reason || 'Rejected';
        remittance.verifiedBy = req.user._id;
        remittance.verifiedAt = new Date();
        await remittance.save();

        res.json({ success: true, message: 'Remittance rejected', remittance });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to reject remittance' });
    }
});

// GET /api/remittances/pending-count
router.get('/pending-count', authenticate, async (req, res) => {
    try {
        const filter = { status: 'submitted' };
        if (req.user.role === 'cabo') filter.caboId = req.user._id;
        const count = await Remittance.countDocuments(filter);
        res.json({ success: true, count });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to get pending count' });
    }
});

module.exports = router;
