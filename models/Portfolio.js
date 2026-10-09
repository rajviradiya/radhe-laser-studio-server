import mongoose from 'mongoose';

const portfolioSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      enum: [
        'Laser Cutting',
        'Acrylic',
        'MDF',
        'Signage',
        'Branding',
        'Name Plates',
        'Décor',
        'Gifts',
        'Custom Products',
      ],
      default: 'Laser Cutting',
    },
    material: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    imageUrl: {
      type: String,
      required: true,
    },
    featured: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

export const Portfolio = mongoose.model('Portfolio', portfolioSchema);
