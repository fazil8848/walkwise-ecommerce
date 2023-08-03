const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;

const couponSchema = new mongoose.Schema({
  valid_from: {
    type: Date,
    default: new Date(),
    required: true,
  },
  valid_to: {
    type: Date,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  code: {
    type: String,
    required: true,
  },
  discount: {
    type: Number,
    required: true,
  },
  usedUsers: [
    {
      type: ObjectId,
      ref: 'User',
    },
  ],
  minCartAmount: {
    type: Number,
    required: true,
  },
  maxDiscountAmount:{
    type: Number,
    required:true
  },
  status: {
    type: Boolean,
    default: true,
    required: true,
  },
  limit: {
    type: Number,
    required: true,
    default: 10,
  },
});

module.exports = mongoose.model('coupons', couponSchema);
