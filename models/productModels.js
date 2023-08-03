const mongoose = require ('mongoose');
const ObjectId = mongoose.Types.ObjectId;


const productSchema = new mongoose.Schema({

    productName:{
        type: String,
        required:true
    },
    brand:{
        type: String,
        required:true
    },
    price:{
        type:Number,
        required: true
    },
    description:{
        type: String,
        required:true
    },
    image:{
        type: Array,
        required:true
    },
    size:{
        type: Array,
        required:true
    },
    quantity:{
        type: Number,
        required:true
    },
    stocked_on:{
        type: Date,
        required:true
    },
    is_hidden:{
        type: Boolean,
        default:false,
        required:true
    },
    category:{
        type: ObjectId,
        ref:'category',
        required:true
    },
    // reviews:{
    //     type: mongoose.Schema.Types.ObjectId,
    //     ref:'review',
    //     required:true
    // },
    // coupons:{
    //     type: mongoose.Schema.Types.ObjectId,
    //     ref:'coupons',
    //     required:true
    // },

});

module.exports = mongoose.model('products',productSchema);