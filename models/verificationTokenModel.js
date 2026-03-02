// models/verificationTokenModel.js
import mongoose from 'mongoose';
import crypto from 'crypto';

const verificationTokenSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    unique: true,
    sparse: true, // Add this to allow multiple nulls (though we won't have nulls)
    default: () => crypto.randomBytes(32).toString('hex') // Always generate a token
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  farmhouseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Farmhouse',
    required: true
  },
  slotId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  label: {
    type: String,
    required: true
  },
  timing: {
    type: String,
    required: true
  },
  expiresAt: {
    type: Date,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  usedAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Remove any existing indexes and create new ones
verificationTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
// Don't add index here, let mongoose sync properly

export const VerificationToken = mongoose.model('VerificationToken', verificationTokenSchema);