const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, 'Username is required'],
        unique: true,
        trim: true,
        minlength: 3,
        maxlength: 30
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: 6,
        select: false
    },
    fullName: {
        type: String,
        required: [true, 'Full name is required'],
        trim: true
    },
    role: {
        type: String,
        enum: ['admin', 'bankero', 'cabo', 'kubrador', 'player'],
        default: 'player'
    },
    phone: {
        type: String,
        trim: true
    },
    parentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    bankroll: {
        type: Number,
        default: 0
    },
    commissionRate: {
        type: Number,
        default: 0.15
    },
    balance: {
        type: Number,
        default: 0
    },
    totalCollections: {
        type: Number,
        default: 0
    },
    totalCommissions: {
        type: Number,
        default: 0
    },
    cell: {
        type: String,
        trim: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isOnline: {
        type: Boolean,
        default: false
    },
    lastLogin: {
        type: Date
    },
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    avatar: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

// Hierarchy validation — Kubrador must have Cabo parent, Cabo must have Bankero parent
userSchema.pre('save', async function () {
    // Set commission rate for new users
    if (this.isNew) {
        switch (this.role) {
            case 'kubrador':
                this.commissionRate = 0.15;
                break;
            case 'cabo':
                this.commissionRate = 0.07;
                break;
            case 'bankero':
                this.commissionRate = 0.25;
                break;
            default:
                this.commissionRate = 0;
        }
    }

    // Validate hierarchy references
    if (this.isModified('parentId') || this.isNew) {
        if (this.role === 'kubrador' && this.parentId) {
            const parent = await mongoose.model('User').findById(this.parentId);
            if (parent && parent.role !== 'cabo') {
                throw new Error('A Kubrador must report to a Cabo.');
            }
        }
        if (this.role === 'cabo' && this.parentId) {
            const parent = await mongoose.model('User').findById(this.parentId);
            if (parent && parent.role !== 'bankero') {
                throw new Error('A Cabo must report to a Bankero.');
            }
        }
        if (this.role === 'player' && this.parentId) {
            const parent = await mongoose.model('User').findById(this.parentId);
            if (parent && parent.role !== 'kubrador') {
                throw new Error('A Player can only be linked to a Kubrador.');
            }
        }
    }

    // Hash password if modified
    if (this.isModified('password')) {
        const salt = await bcrypt.genSalt(12);
        this.password = await bcrypt.hash(this.password, salt);
    }
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
