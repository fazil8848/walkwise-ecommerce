const User = require('../models/userModels');
const Product = require('../models/productModels');
const Cart = require('../models/cartModel');
const Order = require('../models/orderModel')
const fs = require('fs');


const { default: mongoose } = require('mongoose');

const Razorpay = require('razorpay');
const { log } = require('console');

const instance = new Razorpay({
   key_id: process.env.RAZOR_KEY_ID,
   key_secret: process.env.RAZOR_SECRET,
});

let length = 0;

const loadCheckout = async (req, res) => {
   try {
      if (req.session.userData._id) {
         const userId = req.session.userData._id;
         const user = await User.findOne({ _id: userId });
         const cartData = await Cart.findOne({ user: userId }).populate("products.product_id");
         length = req.session.length

         if (cartData.products && cartData.products.length > 0) {
            const total = await Cart.aggregate([
               {
                  $match: { user: new mongoose.Types.ObjectId(userId) },
               },
               {
                  $unwind: "$products",
               },
               {
                  $project: {
                     price: "$products.price",
                     quantity: "$products.quantity",
                  },
               },
               {
                  $group: {
                     _id: null,
                     total: {
                        $sum: {
                           $multiply: ["$quantity", "$price"],
                        },
                     },
                  },
               },
            ]).exec();

            if (total.length > 0 && total[0] !== undefined) {
               const Total = total[0].total;
               res.render("checkout", {
                  products: cartData.products,
                  address: user.address,
                  total: Total,
                  wallet: user.wallet,
                  req: req,
                  length,
               });
            } else {
               res.render("checkout", {
                  noData: true
               });
            }
         } else {
            console.log("There is nothing to checkout.");
         }
      } else {
         res.redirect("/");
      }
   } catch (error) {
      console.log("loadCheckout Method: ", error.message);
   }
};

function generateOrderId(length = 16, includeTimestamp = true) {
   const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
   const timestamp = includeTimestamp ? Date.now().toString() : '';

   let randomChars = '';
   for (let i = 0; i < length - timestamp.length; i++) {
      const randomIndex = Math.floor(Math.random() * chars.length);
      randomChars += chars[randomIndex];
   }

   return includeTimestamp ? timestamp + randomChars : randomChars;
}

const placeOrder = async (req, res) => {
   try {
      if (req.session.userData && req.session.userData._id) {
         const userId = req.session.userData._id;
         const { total, payment, address, wallet, addressId } = req.body;

         const user = await User.findById(userId);

         if (address === null) return res.json({ codFailed: true });

         const cartData = await Cart.findOne({ user: user._id });
         const cartProducts = cartData.products;
         const status = payment == 'cod' ? 'Placed' : 'Pending';

         let wall;
         let cod;
         if (user.wallet < total) {
            wall = 10;
            cod = user.wallet - total - 10
         } else {
            wall = user.wallet - total;
            cod = 0;
         }

         const orderId = generateOrderId(16, true);
         const newOrder = new Order({
            deliveryAddress: address,
            addressId,
            user: userId,
            paymentMethod: payment,
            products: cartProducts,
            totalPrice: total,
            orderDate: new Date(),
            status: status,
            wallet,
            discount: 0,
            couponCode: '',
            orderId,
            codAmount: cod
         });

         const outOfStockProducts = [];

         for (const product of cartProducts) {
            const productData = await Product.findById(product.product_id);
            if (!productData || productData.quantity < product.quantity) {
               outOfStockProducts.push(product.product_id);
            }
         }

         if (outOfStockProducts.length > 0) {
            return res.json({ outOfStockProducts });
         }

         await newOrder.save();
         const orderid = newOrder._id

         if (newOrder.status === 'Placed') {

            await User.updateOne({ _id: userId }, { $set: { wallet: wall } });
            await Cart.deleteOne({ user: userId });

            for (const product of cartProducts) {
               await Product.findByIdAndUpdate(product.product_id, {
                  $inc: { quantity: -product.quantity },
               });
            }

            res.json({ codSuccess: true });
         } else {
            const options = {
               amount: total * 100,
               currency: 'INR',
               receipt: '' + orderid,
            };

            instance.orders.create(options, function (err, order) {
               if (err) {
                  console.log(err);
               }
               res.json({ order });
            });
         }
      } else {
         res.redirect('/login');
      }
   } catch (error) {
      console.log('placeOrder Method: ', error.message);
   }
};



const verifyPayment = async (req, res) => {

   try {

      if (req.session.userData && req.session.userData._id) {

         const userId = req.session.userData._id;
         let user = await User.findById(userId);
         const cart = await Cart.findOne({ user: user._id });
         const products = cart.products;

         const details = req.body;

         const crypto = require('crypto');

         let hmac1 = crypto.createHmac("sha256", process.env.RAZOR_SECRET);

         hmac1.update(
            details['payment[razorpay_order_id]'] + '|' + details['payment[razorpay_payment_id]']
         );
         hmac1 = hmac1.digest('hex');

         if (hmac1 == details['payment[razorpay_signature]']) {

            let orderRecipt = details['order[receipt]'];
            const newOrder = await Order.find().sort({ date: -1 }).limit(1);
            const newId = newOrder.map((value) => {
               return value._id;
            });

            await Order.findByIdAndUpdate(
               newId,
               { $set: { paymentId: details['payment[razorpay_payment_id]'] } }
            )

            await Order.findByIdAndUpdate(orderRecipt,
               {
                  $set: { status: 'Placed' }
               }
            );

            await Cart.deleteOne({ user: userId });

            for (let i = 0; i < products.length; i++) {

               const productId = products[i].product_id;
               const quantity = Number(products[i].quantity);
               await Product.findByIdAndUpdate(productId, {
                  $inc: { quantity: -quantity }
               });

            }
            res.json({ success: true });

         } else {

            await Order.deleteOne({ _id: details['order[receipt]'] });
            res.json({ onlineSuccess: true });

         }

      } else {
         res.redirect('/login');
      }

   } catch (error) {
      console.log('verifyPayment Method :-  ', error.message);
   }

}

const addAddress = async (req, res) => {

   try {

      if (req.session.userData && req.session.userData._id) {

         const { firstName, lastName, address, street, state, city, zipCode, phone, type, country } = req.body;

         if (!firstName || !lastName || !address || !street || !state || !city || !zipCode || !phone || !type || !country) return res.render('add-address', { req, message: 'please Fill all the fields' })

         const id = req.session.userData._id;
         const data = await User.findOneAndUpdate(
            { _id: id },
            {
               $push: {
                  address: {

                     firstName: firstName,
                     lastName: lastName,
                     address: address,
                     phone: phone,
                     city: city,
                     street: street,
                     state: state,
                     zipCode: zipCode,
                     type: type,
                     country,

                  }
               }
            },
            { new: true }
         );
         res.redirect('/checkout')

      } else {
         res.redirect('/login');
      }

   } catch (error) {
      console.log('addAddress Method :-  ', error.message);
   }
};


const checkWallet = async (req, res) => {
   try {
      if (req.session.userData && req.session.userData._id) {
         const userId = req.session.userData._id;
         const userData = await User.findOne({ _id: userId });
         const wallet = userData.wallet;

         if (wallet > 0) {
            res.json({ success: true, wallet });
         } else {
            res.json({ success: false, message: "Wallet amount is zero." });
         }
      } else {
         res.redirect('/login');
      }
   } catch (error) {
      console.log('checkWallet Method:', error.message);
      res.status(500).json({ success: false, message: "Internal Server Error." });
   }
};

const loadOrderPLaced = async (req, res) => {

   try {

      const cart = await Cart.findOne({ user: req.session.userData._id });
      if (cart?.products) {
         length = cart.products.length;
      }

      res.render('order-complete', { req, length })

   } catch (error) {
      console.log('loadOrderPLaced Method :-  ', error.message);
   }

};


const loadOrderList = async (req, res) => {
   try {
      const user = await User.findById(req.session.userData._id);
      const orders = await Order.find({ user: user._id }).sort({ orderDate: -1 })
      const products = await Product.find({});

      const cart = await Cart.findOne({ user: user._id });
      if (cart && cart.products) {
         length = cart.products.length;
      }


      const orderProduct = {};
      const productsArray = {};

      const returnValid = new Date();
      returnValid.setDate(returnValid.getDate() - 10);

      for (const order of orders) {
         if (order.products && order.products.length > 0) {
            const productId = order.products[0].product_id;
            const product = products.find((p) => p._id.equals(productId));
            if (product && product.image && product.image.length > 0) {
               orderProduct[order._id] = product;
            }
            const productsOfOrder = [];

            order.products.forEach(p => {
               const productDetail = products.find(product => product._id.equals(p.product_id));
               if (productDetail) {
                  productsOfOrder.push(productDetail);
               }
            });

            productsArray[order._id] = productsOfOrder;
         }
      }
      res.render("orderLists", { productsArray, req, length, orders, user, orderProduct, returnValid });

   } catch (error) {
      console.log("loadOrderList Method: ", error.message);
   }
};


const returnOrder = async (req, res) => {

   try {

      const userId = req.session.userData._id
      const orderId = req.query.id;
      const order = await Order.findById(orderId);
      const user = await User.findById(userId);
      const total = user.wallet + order.totalPrice;
      const date = new Date();
      if (order.paymentMethod == 'cod' || order.paymentMethod == 'online') {

         await User.findByIdAndUpdate(userId, {
            $set: { wallet: total },
            $push: {
               wallehistory:
               {
                  amount: order.totalPrice,
                  date,
                  transaction: "Product returned",
               }
            }
         }).then(() => {
            console.log('Wallet amount updated');
         })

      }

      const updatedOrder = await Order.findByIdAndUpdate(orderId, {
         status: 'Returned',
         wallet: 0,
      })

      if (updatedOrder) {
         res.redirect('/viewOrders');
      }

   } catch (error) {
      console.log('returnOrder Method :-  ', error.message);
   }

};

const cancelOrder = async (req, res) => {

   try {

      const userId = req.session.userData._id
      const orderId = req.query.id;
      const order = await Order.findById(orderId);

      const date = new Date()

      if (order.paymentMethod == 'razorpay' || order.paymentMethod == 'cod') {
         await User.findByIdAndUpdate(userId, {
            $inc: { wallet: order.totalPrice },
            $push: { wallehistory: { amount: order.totalPrice, date } }
         }).then(() => {
            console.log('wallet amount updated');
         })
      }

      const updatedOrder = await Order.findByIdAndUpdate(orderId, {
         $set: { status: 'Cancelled' }
      })

      if (updatedOrder) {
         res.redirect('/viewOrders')
      }

   } catch (error) {
      console.log('canncelOrder Method :-  ', error.message);
   }

};

const loadOrderAdmin = async (req, res) => {

   try {

      const orders = await Order.find();
      res.render('orders', { orders });

   } catch (error) {
      console.log('loadOrderAdmin Method :-  ', error.message);
   }

};


const singleOrder = async (req, res) => {

   try {

      const orderId = req.query.id
      const order = await Order.findById(orderId).populate('products.product_id');

      const userId = order.user;
      const user = await User.findById(userId);

      if (user) {

         res.render('singleOrder', { order, user });

      } else {
         console.log("user:-", user);
         console.log("order:-", order);
      }

   } catch (error) {
      console.log('singleOrder Admin Method :-  ', error.message);
   }

};

const updateOrderStatus = async (req, res) => {

   try {

      const status = req.body.status;
      const orderId = req.body.id;

      await Order.findByIdAndUpdate(orderId,
         { status: status },
      )
      res.redirect('/admin/orders');

   } catch (error) {
      console.log('updateOrderStatus Method :-  ', error.message);
   }

};




const downloadInvoice = async (req, res) => {
   try {


      const orderId = req.query.id;
      const order = await Order.findById(orderId);
      if (!order) return res.render('404', { message: " downloadInvoice order not found ERROR " })

      // console.log("order-------------",order);

      const userId = order.user;
      const user = await User.findById(userId);
      if (!user) {
         res.render('404', { message: " downloadInvoice User not found ERROR " })
         return;
      }

      // console.log("--user --------------------",user);

      const addressId = order.addressId;
      const address = user.address.find(addr => addr._id.toString() === addressId.toString()); // Compare after converting to string
      if (!address) return res.render('404', { message: " downloadInvoice address not found ERROR " });

      // console.log('address---------',address);

      const orderProductsPromises = order.products.map(async (p) => {
         try {
            const product = await Product.findById(p.product_id);
            if (!product) {
               throw new Error("Product not found");
            }

            return {
               "quantity": p.quantity,
               "description": product.productName,
               "tax-rate": 0,
               "price": product.price,
            };
         } catch (error) {
            console.error("Error fetching product:", error);
            throw error;
         }
      });

      const orderProducts = await Promise.all(orderProductsPromises);

      let orderDate = new Date(order.orderDate);
      orderDate.setDate(orderDate.getDate() + 10);
      let returnDate = orderDate.toISOString().substring(0, 10);

      const logo = process.env.INVOICE_LOGO; // Update the path to the logo file
      const bg = process.env.INVOICE_BG
      res.json({ user, order, address, op: orderProducts, logo, bg, returnDate });

   } catch (error) {
      console.log("DownloadInvoice Method", error.message);
      res.status(500).send("An error occurred");
   }
};

const topupWallet = async (req, res) => {

   try {

      if (req.session.userData && req.session.userData._id) {

         const userId = req.session.userData._id

         const amount = req.body.amount
         if (amount && amount > 100) {

            const options = {
               amount: amount * 100,
               currency: 'INR',
               receipt: '' + userId,
            };

            instance.orders.create(options, function (err, order) {
               if (err) {
                  console.log(err);
               }
               res.json({ order });
            });

         } else {
            res.json({ success: false });
            return;
         }

      } else {
         res.redirect('/login');
      }

   } catch (error) {
      console.log('topupWallet Method :-  ', error.message);
      res.render('404')
   }

};

const verifyTopup = async (req, res) => {

   try {

      if (req.session.userData && req.session.userData._id) {

         const userId = req.session.userData._id;
         let user = await User.findById(userId);

         const details = req.body;
         console.log(details);

         const crypto = require('crypto');

         let hmac1 = crypto.createHmac("sha256", process.env.RAZOR_SECRET);

         hmac1.update(
            details['payment[razorpay_order_id]'] + '|' + details['payment[razorpay_payment_id]']
         );
         hmac1 = hmac1.digest('hex');

         if (hmac1 == details['payment[razorpay_signature]']) {

            await User.findByIdAndUpdate(user._id, {
               $set:{ wallet: am}
            });

            res.json({ success: true });

         } else {

            await Order.deleteOne({ _id: details['order[receipt]'] });
            res.json({ onlineSuccess: true });

         }

      } else {
         res.redirect('/login');
      }

   } catch (error) {
      console.log('verifyTopup Method :-  ', error.message);
   }

}




module.exports = {

   loadCheckout,
   placeOrder,
   checkWallet,
   loadOrderPLaced,
   addAddress,
   loadOrderList,
   returnOrder,
   cancelOrder,
   loadOrderAdmin,
   singleOrder,
   updateOrderStatus,
   verifyPayment,
   downloadInvoice,
   topupWallet,
   verifyTopup,


}