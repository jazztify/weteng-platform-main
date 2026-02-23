const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');

// Generate JWT Token
const generateToken = (user) => {
    return jwt.sign(
        { id: user._id, role: user.role, username: user.username },
        process.env.JWT_SECRET || 'fallback_secret_key_if_missing_in_env',
        { expiresIn: '24h' }
    );
};

// POST /api/auth/register
router.post('/register', [
    body('username').trim().isLength({ min: 3, max: 30 }).withMessage('Username must be 3-30 characters'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('fullName').trim().notEmpty().withMessage('Full name is required'),
    body('role').optional().isIn(['admin', 'bankero', 'cabo', 'kubrador', 'player'])
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { username, email, password, fullName, role, phone, parentId, cell } = req.body;

        // Check existing user
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

        const token = generateToken(user);

        res.status(201).json({
            success: true,
            message: 'Registration successful',
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                fullName: user.fullName,
                role: user.role,
                balance: user.balance,
                commissionRate: user.commissionRate
            }
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ success: false, message: 'Registration failed' });
    }
});

// POST /api/auth/login
router.post('/login', [
    body('username').trim().notEmpty().withMessage('Username is required'),
    body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { username, password } = req.body;

        const user = await User.findOne({
            $or: [{ username }, { email: username }]
        }).select('+password');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                message: 'Account is deactivated. Contact your supervisor.'
            });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Update login info
        user.lastLogin = new Date();
        user.isOnline = true;
        await user.save();

        const token = generateToken(user);

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });

        res.json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                fullName: user.fullName,
                role: user.role,
                balance: user.balance,
                commissionRate: user.commissionRate,
                lastLogin: user.lastLogin
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Login failed: ' + (error.message || error) });
    }
});

// POST /api/auth/logout
router.post('/logout', authenticate, async (req, res) => {
    try {
        req.user.isOnline = false;
        await req.user.save();
        res.clearCookie('token');
        res.json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Logout failed' });
    }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).populate('parentId', 'fullName role username');
        res.json({
            success: true,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                fullName: user.fullName,
                role: user.role,
                balance: user.balance,
                commissionRate: user.commissionRate,
                totalCollections: user.totalCollections,
                totalCommissions: user.totalCommissions,
                phone: user.phone,
                cell: user.cell,
                isActive: user.isActive,
                lastLogin: user.lastLogin,
                parent: user.parentId,
                createdAt: user.createdAt
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to get user info' });
    }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', [
    body('email').isEmail().withMessage('Valid email required')
], async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.json({ success: true, message: 'If the email exists, a reset link has been sent.' });
        }

        // Generate reset token
        const resetToken = jwt.sign(
            { id: user._id },
            process.env.JWT_RESET_SECRET || 'reset_secret',
            { expiresIn: '30m' }
        );

        user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        user.resetPasswordExpires = Date.now() + 30 * 60 * 1000; // 30 minutes
        await user.save();

        // In production, send email via Nodemailer
        console.log(`🔐 Password reset link: ${process.env.CLIENT_URL}/reset-password/${resetToken}`);

        res.json({
            success: true,
            message: 'If the email exists, a reset link has been sent.',
            // Include token in dev mode for testing
            ...(process.env.NODE_ENV === 'development' && { resetToken })
        });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ success: false, message: 'Failed to process request' });
    }
});

// POST /api/auth/reset-password/:token
router.post('/reset-password/:token', [
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
    try {
        const decoded = jwt.verify(req.params.token, process.env.JWT_RESET_SECRET || 'reset_secret');
        const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

        const user = await User.findOne({
            _id: decoded.id,
            resetPasswordToken: hashedToken,
            resetPasswordExpires: { $gt: Date.now() }
        }).select('+password');

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired reset token'
            });
        }

        user.password = req.body.password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.json({ success: true, message: 'Password reset successful. Please login with your new password.' });
    } catch (error) {
        res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
    }
});

// Temporary route: GET /api/auth/force-admin
router.get('/force-admin', async (req, res) => {
    try {
        let user = await User.findOne({ username: 'admin' });

        if (!user) {
            // Create user from scratch
            user = new User({
                username: 'admin',
                email: 'admin@weteng.ph',
                password: 'admin123',
                fullName: 'System Administrator',
                role: 'admin',
                phone: '+63-917-000-0001',
                balance: 0
            });
            await user.save();
            return res.json({ success: true, message: "User 'admin' successfully created with role 'admin' and password 'admin123'." });
        } else {
            user.role = 'admin';
            user.password = 'admin123'; // Force password reset to admin123
            await user.save();
            return res.json({ success: true, message: "User 'admin' role successfully updated to 'admin' and password reset to 'admin123'." });
        }
    } catch (error) {
        console.error('Force admin error:', error);
        res.status(500).json({ success: false, message: 'Server error: ' + (error.message || error) });
    }
});

// Temporary route: GET /api/auth/seed-all-roles
router.get('/seed-all-roles', async (req, res) => {
    try {
        // Delete the broken GRIM account
        await User.deleteMany({ username: { $regex: /^GRIM$/i } });

        const rolesToSeed = [
            { role: 'bankero', username: 'bankero_test', fullName: 'Don Ricardo Bankero', email: 'bankero_test@weteng.ph', balance: 500000 },
            { role: 'cabo', username: 'cabo_test', fullName: 'Juan Cabo', email: 'cabo_test@weteng.ph', balance: 5000 },
            { role: 'kubrador', username: 'kubra_test', fullName: 'Pedro Kubra', email: 'kubra_test@weteng.ph', balance: 1000 },
            { role: 'player', username: 'player_test', fullName: 'Carlos Player', email: 'player_test@weteng.ph', balance: 500 }
        ];

        const results = { created: [], updated: [] };

        for (const data of rolesToSeed) {
            let user = await User.findOne({ username: data.username });
            if (!user) {
                user = new User({
                    username: data.username,
                    email: data.email,
                    password: 'password123',
                    fullName: data.fullName,
                    role: data.role,
                    phone: `+63-917-${Math.floor(1000000 + Math.random() * 9000000)}`,
                    balance: data.balance
                });
                await user.save();
                results.created.push({ role: data.role, username: data.username });
            } else {
                // Force sync the role and password
                user.role = data.role;
                user.password = 'password123';
                await user.save();
                results.updated.push({ role: data.role, username: user.username });
            }
        }

        res.json({
            success: true,
            message: 'Seed check complete. GRIM deleted. All roles synced.',
            data: results,
            note: 'Default password for all accounts is: password123'
        });
    } catch (error) {
        console.error('Seed all roles error:', error);
        res.status(500).json({ success: false, message: 'Server error: ' + (error.message || error) });
    }
});

module.exports = router;
