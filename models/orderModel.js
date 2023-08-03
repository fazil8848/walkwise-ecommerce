const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;

const orderSchema = new mongoose.Schema({
    deliveryAddress: {
        type: String,
        required: true
    },
    user: {
        type: ObjectId,
        ref: 'User',
        required: true
    },
    paymentMethod: {
        type: String,
        required: true
    },
    products: [
        {
            product_id: {
                type: ObjectId,
                ref: 'products',
                required: true
            },
            quantity: {
                type: Number,
                // default: 1,
                required: true
            },
        },
    ],
    paymentId: {
        type: String,
    },
    totalPrice: {
        type: Number,
        required: true
    },
    orderDate: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        required: true
    },
    wallet: {
        type: Number,
        required: true,
        default: 0,
    },
    discount: {
        type: Number,
        required: true
    },
    orderId: {
        type: String,
        
    },
    codAmount:{
        type:Number,
    }


},
    {
        timestamps: true
    }
)

module.exports = mongoose.model('order', orderSchema);