const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authenticate, authorize } = require('../middleware/auth');

// GET /api/users - List users (Admin/Bankero)
router.get('/', authenticate, authorize('admin', 'bankero'), async (req, res) => {
    try {
        const { role, isActive, page = 1, limit = 50, search } = req.query;
        const filter = {};

        if (role) filter.role = role;
        if (isActive !== undefined) filter.isActive = isActive === 'true';
        if (search) {
            filter.$or = [
                { username: { $regex: search, $options: 'i' } },
                { fullName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }

        const users = await User.find(filter)
            .populate('parentId', 'fullName username role')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await User.countDocuments(filter);

        res.json({
            success: true,
            users,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch users' });
    }
});

// POST /api/users - Create User (Admin only)
router.post('/', authenticate, authorize('admin'), async (req, res) => {
    try {
        const { username, email, password, fullName, role, phone, parentId, cell } = req.body;

        const existingUser = await User.findOne({ $or: [{ email }, { username }] });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: existingUser.email === email ? 'Email already registered' : 'Username already taken'
            });
        }

        const user = new User({
            username,
            email,
            password,
            fullName,
            role: role || 'kubrador',
            phone,
            parentId,
            cell
        });

        await user.save();

        res.status(201).json({
            success: true,
            message: 'User created successfully',
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                fullName: user.fullName,
                role: user.role,
                isActive: user.isActive,
                createdAt: user.createdAt
            }
        });
    } catch (error) {
        console.error('Create user error:', error);
        res.status(500).json({ success: false, message: 'Failed to create user' });
    }
});

// GET /api/users/hierarchy - Get user hierarchy tree
router.get('/hierarchy', authenticate, authorize('admin', 'bankero'), async (req, res) => {
    try {
        const bankeros = await User.find({ role: 'bankero' }).lean();
        const cabos = await User.find({ role: 'cabo' }).lean();
        const kubradors = await User.find({ role: 'kubrador' }).lean();

        const hierarchy = bankeros.map(bankero => ({
            ...bankero,
            cabos: cabos
                .filter(c => c.parentId && c.parentId.toString() === bankero._id.toString())
                .map(cabo => ({
                    ...cabo,
                    kubradors: kubradors.filter(k => k.parentId && k.parentId.toString() === cabo._id.toString())
                }))
        }));

        res.json({ success: true, hierarchy });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch hierarchy' });
    }
});

// GET /api/users/my-team - Get subordinates for Cabo
router.get('/my-team', authenticate, authorize('cabo', 'bankero', 'admin'), async (req, res) => {
    try {
        const subordinates = await User.find({ parentId: req.user._id })
            .sort({ createdAt: -1 });

        res.json({ success: true, team: subordinates });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch team' });
    }
});

// GET /api/users/:id
router.get('/:id', authenticate, async (req, res) => {
    try {
        const user = await User.findById(req.params.id).populate('parentId', 'fullName role username');
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        res.json({ success: true, user });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to fetch user' });
    }
});

// PUT /api/users/:id - Update user
router.put('/:id', authenticate, authorize('admin', 'bankero'), async (req, res) => {
    try {
        const { fullName, phone, cell, isActive, commissionRate, role, parentId } = req.body;
        const updateData = {};

        if (fullName) updateData.fullName = fullName;
        if (phone) updateData.phone = phone;
        if (cell) updateData.cell = cell;
        if (isActive !== undefined) updateData.isActive = isActive;
        if (commissionRate !== undefined) updateData.commissionRate = commissionRate;
        if (role) updateData.role = role;
        if (parentId) updateData.parentId = parentId;

        const user = await User.findByIdAndUpdate(req.params.id, updateData, { new: true });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.json({ success: true, message: 'User updated', user });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to update user' });
    }
});

// DELETE /api/users/:id - Deactivate user
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
    try {
        const user = await User.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        res.json({ success: true, message: 'User deactivated', user });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to deactivate user' });
    }
});

module.exports = router;
