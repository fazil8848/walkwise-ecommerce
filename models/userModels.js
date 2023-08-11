const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({

    firstName: {
        type: String,
        reqired: true
    },
    lastName: {
        type: String,
        reqired: true
    },
    userName: {
        type: String,
        reqired: true
    },
    email: {
        type: String,
        reqired: true
    },
    password: {
        type: String,
        reqired: true
    },
    phone: {
        type: String,
        reqired: true
    },
    is_blocked: {
        type: Number,
        default: 0
    },
    address: [{

        firstName: {
            type: String,
            required: true,

        },
        lastName: {
            type: String,
            required: true,

        },
        phone: {
            type: String,
            required: true,
        },
        address: {
            type: String,
            required: true,
        },

        state: {
            type: String,
            required: true,
        },
        city: {
            type: String,
            required: true,
        },
        street: {
            type: String,
            required: true,
        },
        zipCode: {
            type: String,
            required: true,
        },
        type: {
            type: String,
            required: true,
        },
        country: {
            type: String,
            required: true,
        },

    }],
    wallet: {
        type: Number,
        default: 0,
    },
    wallehistory: [{
        amount: {
            type: Number,
        },
        date: {
            type: Date,
        },
        transaction: {
            type: String,
        }
    }],

});

userSchema.statics.isExistingEmail = async function (email) {

    try {

        const user = await this.findOne({ email });
        if (user) return false;

        return true;

    } catch (error) {
        console.log('error is inside isExistingEmail', error.message);
        return false;
    }


}
userSchema.statics.isExistingUserName = async function (userName) {

    try {

        const user = await this.findOne({ name: userName });

        if (user) return false;

        return true;

    } catch (error) {
        console.log('the error is in isExistingUsername function', error.message);
    }
}

module.exports = mongoose.model('User', userSchema);