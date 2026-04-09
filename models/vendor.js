// models/vendor.js
import mongoose from "mongoose";
import { v4 as uuidv4 } from 'uuid';

const vendorSchema = new mongoose.Schema({
  name: { type: String },
  password: { type: String },
  email: { type: String, required: true },
  farmhouseId: { type: mongoose.Schema.Types.ObjectId, ref: "Farmhouse" },
  applicationId: { 
    type: String, 
    unique: true,
    default: () => `APP-${Date.now()}-${uuidv4().substring(0, 8)}`
  },
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected', 'needs_modification'],
    default: 'pending'
  },
  submittedData: {
    name: String,
    address: String,
    description: String,
    amenities: [String],
    price: Number,
    rating: Number,
    feedbackSummary: String,
    bookingFor: String,
    lat: Number,
    lng: Number,
    timePrices: Array,
    images: [String]
  },
  adminNotes: String,
  rejectedReason: String,
  reviewedBy: { type: String }, // ✅ Changed from ObjectId to String
  reviewedAt: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export const Vendor = mongoose.model("Vendor", vendorSchema);