const mongoose = require('mongoose');
const Decimal128 = mongoose.Types.Decimal128;


const reviewSchema = new mongoose.Schema({

    userRating:{
        type:Decimal128,
        required:true
    },
    userReview:{
        type:String,
        required:true
    },
    reviewDate:{
        type:Date,
        required:true
    }

});

module.exports = mongoose.model('review',reviewSchema);