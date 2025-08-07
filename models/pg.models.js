import mongoose from 'mongoose';

const pgSchema = new mongoose.Schema({
  name: String,
  location: String,
  price: Number,
  amenities: [String],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const PG = mongoose.model('PG', pgSchema);
export default PG;
