import mongoose from 'mongoose';

const uploadedFileSchema = new mongoose.Schema({
  originalName: { type: String, required: true },
  fileName: { type: String, required: true },
  filePath: { type: String, required: true },
  fileSize: { type: Number, required: true },
  mimeType: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now },
});

const enquirySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true,
    },
    companyName: {
      type: String,
      trim: true,
      default: '',
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    whatsapp: {
      type: String,
      trim: true,
      default: '',
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
    },
    service: {
      type: String,
      default: 'General Laser Cutting',
      trim: true,
    },
    product: {
      type: String,
      default: 'Custom Project',
      trim: true,
    },
    material: {
      type: String,
      default: 'Acrylic',
      trim: true,
    },
    quantity: {
      type: String,
      default: '1',
    },
    width: {
      type: String,
      default: '',
      trim: true,
    },
    height: {
      type: String,
      default: '',
      trim: true,
    },
    thickness: {
      type: String,
      default: '',
      trim: true,
    },
    requiredDate: {
      type: String,
      default: '',
    },
    message: {
      type: String,
      trim: true,
      default: '',
    },
    uploadedFiles: [uploadedFileSchema],
    status: {
      type: String,
      enum: ['New', 'Contacted', 'Quoted', 'In Production', 'Completed', 'Cancelled'],
      default: 'New',
    },
    internalNotes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

export const Enquiry = mongoose.model('Enquiry', enquirySchema);
