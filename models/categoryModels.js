const mongoose = require('mongoose');


const category = new mongoose.Schema({

    name: {
        type: String,
        required: true
    },
    is_hidden: {
        type: Boolean,
        default: false,
    }
});

module.exports = mongoose.model('category',category);