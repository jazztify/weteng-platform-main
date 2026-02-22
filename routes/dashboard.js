const express = require('express');
const router = express.Router();
const Bet = require('../models/Bet');
const Draw = require('../models/Draw');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { authenticate, authorize } = require('../middleware/auth');

// GET /api/dashboard/stats - Overview stats
router.get('/stats', authenticate, async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        let stats = {};

        if (req.user.role === 'admin' || req.user.role === 'bankero') {
            const [
                totalUsers,
                activeKubradors,
                todayBets,
                todayCollections,
                todayPayouts,
                totalDraws,
                activeDraws
            ] = await Promise.all([
                User.countDocuments({}),
                User.countDocuments({ role: 'kubrador', isActive: true }),
                Bet.countDocuments({ createdAt: { $gte: today, $lt: tomorrow } }),
                Bet.aggregate([
                    { $match: { createdAt: { $gte: today, $lt: tomorrow } } },
                    { $group: { _id: null, total: { $sum: '$amount' } } }
                ]),
                Bet.aggregate([
                    { $match: { createdAt: { $gte: today, $lt: tomorrow }, status: 'won' } },
                    { $group: { _id: null, total: { $sum: '$actualPayout' } } }
                ]),
                Draw.countDocuments({}),
                Draw.countDocuments({ status: { $in: ['upcoming', 'open'] }, drawDate: { $gte: today, $lt: tomorrow } })
            ]);

            stats = {
                totalUsers,
                activeKubradors,
                todayBets,
                todayCollections: todayCollections[0]?.total || 0,
                todayPayouts: todayPayouts[0]?.total || 0,
                netRevenue: (todayCollections[0]?.total || 0) - (todayPayouts[0]?.total || 0),
                totalDraws,
                activeDraws
            };
        } else if (req.user.role === 'cabo') {
            const myKubradors = await User.find({ parentId: req.user._id }).select('_id');
            const kubradorIds = myKubradors.map(k => k._id);

            const [todayBets, todayCollections] = await Promise.all([
                Bet.countDocuments({ kubradorId: { $in: kubradorIds }, createdAt: { $gte: today, $lt: tomorrow } }),
                Bet.aggregate([
                    { $match: { kubradorId: { $in: kubradorIds }, createdAt: { $gte: today, $lt: tomorrow } } },
                    { $group: { _id: null, total: { $sum: '$amount' } } }
                ])
            ]);

            stats = {
                teamSize: myKubradors.length,
                todayBets,
                todayCollections: todayCollections[0]?.total || 0,
                myCommissions: req.user.totalCommissions,
                balance: req.user.balance
            };
        } else if (req.user.role === 'kubrador') {
            const [todayBets, todayCollections] = await Promise.all([
                Bet.countDocuments({ kubradorId: req.user._id, createdAt: { $gte: today, $lt: tomorrow } }),
                Bet.aggregate([
                    { $match: { kubradorId: req.user._id, createdAt: { $gte: today, $lt: tomorrow } } },
                    { $group: { _id: null, total: { $sum: '$amount' } } }
                ])
            ]);

            stats = {
                todayBets,
                todayCollections: todayCollections[0]?.total || 0,
                todayCommissions: (todayCollections[0]?.total || 0) * req.user.commissionRate,
                totalCommissions: req.user.totalCommissions,
                balance: req.user.balance
            };
        } else if (req.user.role === 'player') {
            const [pendingDeposits, approvedDepositsAgg] = await Promise.all([
                Transaction.countDocuments({ userId: req.user._id, status: 'Pending', type: 'deposit' }),
                Transaction.aggregate([
                    { $match: { userId: req.user._id, status: 'Approved', type: 'deposit' } },
                    { $group: { _id: null, total: { $sum: '$amount' }, count: { $sum: 1 } } }
                ])
            ]);

            stats = {
                balance: req.user.balance,
                pendingDeposits,
                totalDeposited: approvedDepositsAgg[0]?.total || 0,
                depositCount: approvedDepositsAgg[0]?.count || 0
            };
        }

        res.json({ success: true, stats });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch stats' });
    }
});

// GET /api/dashboard/transactions - Recent transactions
router.get('/transactions', authenticate, async (req, res) => {
    try {
        const { type, page = 1, limit = 20 } = req.query;
        const filter = { userId: req.user._id };
        if (type) filter.type = type;

        const transactions = await Transaction.find(filter)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await Transaction.countDocuments(filter);

        res.json({
            success: true,
            transactions,
            pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch transactions' });
    }
});

// GET /api/dashboard/hot-numbers - Number frequency analysis
router.get('/hot-numbers', authenticate, async (req, res) => {
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const hotNumbers = await Bet.aggregate([
            { $match: { createdAt: { $gte: thirtyDaysAgo } } },
            {
                $group: {
                    _id: { num1: '$numbers.num1', num2: '$numbers.num2' },
                    count: { $sum: 1 },
                    totalAmount: { $sum: '$amount' }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 20 }
        ]);

        res.json({ success: true, hotNumbers });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch hot numbers' });
    }
});

// GET /api/dashboard/audit - Anomaly detection (Admin/Bankero)
router.get('/audit', authenticate, authorize('admin', 'bankero'), async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Check for anomalous kubrador collections
        const kubradorStats = await Bet.aggregate([
            { $match: { createdAt: { $gte: today, $lt: tomorrow } } },
            {
                $group: {
                    _id: '$kubradorId',
                    totalBets: { $sum: 1 },
                    totalAmount: { $sum: '$amount' }
                }
            },
            { $sort: { totalAmount: -1 } }
        ]);

        // Calculate average
        const avgCollection = kubradorStats.reduce((a, b) => a + b.totalAmount, 0) / (kubradorStats.length || 1);

        const anomalies = kubradorStats
            .filter(k => k.totalAmount > avgCollection * 3)
            .map(k => ({
                kubradorId: k._id,
                totalBets: k.totalBets,
                totalAmount: k.totalAmount,
                percentAboveAvg: Math.round(((k.totalAmount / avgCollection) - 1) * 100)
            }));

        // Get recent draw boka alerts
        const recentDrawsWithAlerts = await Draw.find({
            'bokaAlerts.0': { $exists: true }
        }).sort({ drawDate: -1 }).limit(5);

        res.json({
            success: true,
            audit: {
                avgKubradorCollection: Math.round(avgCollection),
                anomalousKubradors: anomalies,
                recentBokaAlerts: recentDrawsWithAlerts
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch audit data' });
    }
});

module.exports = router;
