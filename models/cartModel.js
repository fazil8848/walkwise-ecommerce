const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;


const cartSchema = new mongoose.Schema({

    products: [{
        product_id: {
            type: ObjectId,
            ref: 'products',
            required: true
        },
        quantity: {
            type: Number,
            default: 1,
            required: true
        },
        price: {
            type: Number,
            default: 0,
            required: true
        },
        total_price: {
            type: Number,
            default:0,
            required: true
        },
    }],
    
    user: {
        type: ObjectId,
        ref: 'user',
        required: true
    }

});

module.exports = mongoose.model("Cart", cartSchema);