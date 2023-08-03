
const { Code } = require('mongodb');
const Coupons = require('../models/couponsModel');
const User = require('../models/userModels');


const loadCouponList = async (req, res) => {

    try {

        const coupons = await Coupons.find();
        const date = new Date();
        res.render('couponList', { coupons, date });

    } catch (error) {
        console.log('loadCouponList Method :-  ', error.message);
    }

}

const loadAddCoupon = async (req, res) => {

    try {

        res.render('addcoupon');

    } catch (error) {
        console.log('loadAddCoupon Method :-  ', error.message);
    }

};

const addCoupon = async (req, res) => {
    try {

        const { expiry, name, code, from, discount, min, limit } = req.body

        const coupon = Coupons({
            valid_from: from,
            valid_to: expiry,
            minCartAmount: min,
            name,
            code,
            discount,
            limit
        });

        await coupon.save();
        res.redirect('/admin/coupons');
    } catch (error) {
        console.log('addCoupon Method :-  ', error.message);
        res.status(500).json({ error: 'Internal server error.' });
    }
};

const deleteCoupon = async (req, res) => {

    try {

        const couponID = req.params.id;
        const deleted = await Coupons.findByIdAndDelete(couponID)

        if (deleted) {
            res.redirect('/admin/coupons')
        } else {
            res.render('couponList', { message: ' Deleting Coupon Failed ' })
        }

    } catch (error) {
        console.log('deleteCoupon Method :-  ', error.message);
    }

}

const applyCoupon = async (req, res) => {

    try {

        if (req.session.userData && req.session.userData._id) {

            const userId = req.session.userData._id
            const couponCode = req.body.code;
            const price = req.body.amount;
            const user = await User.findById(userId);

            const userexist = await Coupons.findOne({
                couponcode: couponCode,
                usedUsers: { $in: [user._id] },
            });

            if (userexist) {
                // If the user exists in the 'used' array, it means the coupon has already been used by this user.
                res.json({ user: true });
            } else {
                const coupon = await Coupons.findOne({ code: couponCode });
                if (coupon) {
                    if (coupon.valid_to >= new Date()) {
                        if (coupon.limit != 0) {
                            if (coupon.minCartAmount <= price) {
                                let discountedAmount = price * (coupon.discount / 100);

                                if (discountedAmount > coupon.maxDiscountAmount) {
                                    discountedAmount = coupon.maxDiscountAmount;
                                }

                                let discountedTotal = Math.round(price - discountedAmount);
                                let couponId = coupon._id;

                                
                                req.session.couponId = couponId;
                                res.json({
                                    couponKey: true,
                                    discountedTotal,
                                    discount: coupon.discount,
                                    couponCode,
                                });
                            } else {
                                res.json({ cartamount: true });
                            }
                        } else {
                            res.json({ limit: true });
                        }
                    } else {
                        res.json({ expire: true });
                    }
                } else {
                    res.json({ invalid: true });
                }
            }

        } else {
            res.redirect('/login')
        }


    } catch (error) {
        console.log('applyCoupon Method :-  ', error.message);
    }

}


module.exports = {

    loadCouponList,
    loadAddCoupon,
    addCoupon,
    deleteCoupon,
    applyCoupon

}