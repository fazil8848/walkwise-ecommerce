const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;


const adminSchema = new mongoose.Schema({

    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    products: {
        type: ObjectId,
        ref: 'products',
        required: true
    },
    category: {
        type: ObjectId,
        ref: 'category',
        required: true
    },
    orders: {
        type: ObjectId,
        ref: "orders",
        required: true
    },
    coupons: {
        type: ObjectId,
        ref: 'coupons',
        required: true
    }

});

module.exports = mongoose.model('admin', adminSchema);