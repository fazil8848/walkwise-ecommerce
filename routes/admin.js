const express = require('express');
const admin_app = express();

const nocache = require('nocache');
const auth = require('../middleware/adminAuth');
const adminController = require('../controllers/adminConroller');
const categoryContoller = require('../controllers/category');
const orderController = require('../controllers/order');
const couponController = require('../controllers/coupon');
const upload = require('../middleware/multer')

admin_app.use(nocache());

admin_app.set('view engine', 'ejs');
admin_app.set('views', './views/admin');

// ROUTS

// User ----------------------
//GET
admin_app.get('/', auth.isLogout, nocache(), adminController.loadLogin);
admin_app.get('/home', auth.isLogin, nocache(), adminController.loadHome);
admin_app.get('/logout', nocache(), adminController.logout);
admin_app.get('/manageUsers', auth.isLogin, nocache(), adminController.manageUser);
admin_app.get('/unblock', auth.isLogin, nocache(), adminController.unblockUser);
admin_app.get('/block', auth.isLogin, nocache(), adminController.blockUser);
admin_app.get('/salesReport', auth.isLogin, nocache(), adminController.loadSales);
admin_app.get('/downloadSalesExcel', auth.isLogin, nocache(), adminController.salesReportDownload);
admin_app.get('/downloadSalesPDF', auth.isLogin, nocache(), adminController.salesReportDownloadPdf);


// POST
admin_app.post('/', adminController.verifyLogin);



// Products --------------------
//GET
admin_app.get('/manageProducts', auth.isLogin, nocache(), adminController.productManager);
admin_app.get('/addProducts', auth.isLogin, nocache(), adminController.loadAddProducts);
admin_app.get('/hideProducts', auth.isLogin, nocache(), adminController.hideProducts);
admin_app.get('/editProducts', auth.isLogin, nocache(), adminController.loadEditProducts);

// POST
admin_app.post('/addProducts', upload.array("image", 5), adminController.addProducts);
admin_app.post('/productsEdit', upload.array("image", 5), adminController.editProduct);
admin_app.post('/removeImage', adminController.removeImage);
admin_app.post('/updateStock', adminController.updateStock);


// Categories---------------------
//GET
admin_app.get('/categories', auth.isLogin, nocache(), categoryContoller.loadCategory);
admin_app.get('/addCategories', auth.isLogin, nocache(), categoryContoller.loadAddCategory);
admin_app.get("/editCategory/:id", auth.isLogin, nocache(), categoryContoller.loadEditCategory);
admin_app.get('/hideCategory', auth.isLogin, nocache(), categoryContoller.hideCategory);


// POST
admin_app.post('/addCategory', categoryContoller.addCategory);
admin_app.post("/saveCategory/:id", categoryContoller.editCategory);



// Orders---------------------
//GET
admin_app.get('/orders', auth.isLogin, nocache(), orderController.loadOrderAdmin);
admin_app.get('/orderDetails', auth.isLogin, nocache(), orderController.singleOrder);

//POST
admin_app.post("/updateStatus", orderController.updateOrderStatus);


// Coupons ---------------------
//GET
admin_app.get('/coupons', auth.isLogin, nocache(), couponController.loadCouponList);
admin_app.get('/addCoupons', auth.isLogin, nocache(), couponController.loadAddCoupon);
admin_app.get('/deleteCoupon/:id', auth.isLogin, nocache(), couponController.deleteCoupon);

//POST ---------------------
admin_app.post("/addcoupon", couponController.addCoupon);




module.exports = admin_app; 