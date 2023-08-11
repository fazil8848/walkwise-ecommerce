const express = require('express');
const config = require('../config/config');
const auth = require('../middleware/auth');
const nocache = require("nocache");
// const path =  require('path');
// const ejs = require('ejs');


const user_app = express();
//   secret: config.sessionSecret,
//   resave: false,
//   saveUninitialized: true,
//   cookie: {
//     maxAge: 6000000 // Set session lifetime to 24 hours
//   }
// }));


user_app.use(nocache());

const userController = require("../controllers/userController");
const cartController = require('../controllers/cartController');
const orderController = require('../controllers/order');
const couponController = require('../controllers/coupon');


// ===================   Routes   =====================


// GET

user_app.get('/signup', nocache(), auth.isLogout, userController.loadSignup);
user_app.get('/otp', nocache(), userController.loadOTP);
user_app.get('/', nocache(), userController.loadHome);
user_app.get('/login', nocache(), auth.isLogout, nocache(), userController.loadLogin);
user_app.get('/home', nocache(), userController.loadHome);
user_app.get('/shop', nocache(), userController.loadShop);
user_app.get('/about', nocache(), userController.loadAbout);
user_app.get('/contact', nocache(), userController.loadContacts);
user_app.get('/logout', auth.isLogin, nocache(), userController.userLogout);
user_app.get('/productDetails', nocache(), userController.singleProduct);
user_app.get('/userProfile', auth.isLogin, nocache(), userController.loadProfile);
user_app.get('/cart', auth.isLogin, nocache(), cartController.loadCart);
user_app.get("/addtoCart", auth.isLogin, nocache(), cartController.addToCart);
user_app.get("/addressList", auth.isLogin, nocache(), userController.loadAddressList);
user_app.get("/addAddress", auth.isLogin, nocache(), userController.loadAddAddress);
user_app.get("/editAddress", auth.isLogin, nocache(), userController.loadEditAddress);
user_app.get("/deleteAddress", auth.isLogin, nocache(), userController.deleteAddress);
user_app.get("/updateProfile", auth.isLogin, nocache(), userController.loadUpdateData);
user_app.get("/changePass", auth.isLogin, nocache(), userController.loadChangePass);
user_app.get("/forgotPass", nocache(), userController.loadForgotPass);
user_app.get("/checkOut", auth.isLogin, nocache(), orderController.loadCheckout);
user_app.get("/orderPlaced", auth.isLogin, nocache(), orderController.loadOrderPLaced);
user_app.get("/viewOrders", auth.isLogin, nocache(), orderController.loadOrderList);
user_app.get("/retunOrder", auth.isLogin, nocache(), orderController.returnOrder);
user_app.get("/cancelOrder", auth.isLogin, nocache(), orderController.cancelOrder);
user_app.get("/downloadInvoice", auth.isLogin, nocache(), orderController.downloadInvoice);




// POST

user_app.post('/signup', userController.insertUser);
user_app.post('/checkotp', userController.verifyOTP);
user_app.post('/login', userController.verifyLogin);
user_app.post('/', userController.verifyLogin);
user_app.post('/addtoCart', cartController.addToCart);
user_app.post('/changeQty', cartController.changeQty);
user_app.post('/removeCartItem', cartController.removeItemCart);
user_app.post('/addAddress', userController.addAddress);
user_app.post('/search', userController.search);
user_app.post('/addCheckoutAddress', orderController.addAddress);
user_app.post('/editAddress', userController.editAddress);
user_app.post('/updateProfile', userController.updateData);
user_app.post('/changePass', userController.changePass);
user_app.post('/forgotPass', userController.forgotPass);
user_app.post('/verifyForgotOtp', userController.verifyFotp);
user_app.post('/updatePass', userController.updatePass);
user_app.post('/placeOrder', orderController.placeOrder);
user_app.post('/checkWallet', orderController.checkWallet);
user_app.post('/verifyPayment', orderController.verifyPayment);
user_app.post('/applyCoupon', couponController.applyCoupon);
user_app.post('/topupWallet', orderController.topupWallet);
user_app.post('/verifyTopup', orderController.verifyTopup);







// View engine setup
user_app.set('view engine', 'ejs');
user_app.set('views', './views/user');



module.exports = user_app;


