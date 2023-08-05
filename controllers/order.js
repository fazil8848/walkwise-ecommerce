const User = require('../models/userModels');
const Product = require('../models/productModels');
const Cart = require('../models/cartModel');
const Order = require('../models/orderModel')
const puppeteer = require('puppeteer');

const { default: mongoose } = require('mongoose');

const Razorpay = require('razorpay');

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
         const { total, payment, address, wallet } = req.body;

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

      if (order.paymentMethod == 'cod' || order.paymentMethod == 'online') {

         await User.findByIdAndUpdate(userId, {
            $set: { wallet: total },
            $push: { wallehistory: { amount: order.totalPrice, date } }
         }).then(() => {
            console.log('wallet amount updated');
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
      const browser = await puppeteer.launch();
      const page = await browser.newPage();

      // Load your HTML template from the front end or a file
      const template = `
      <!DOCTYPE html>
      <html lang="en">
      
      <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>WalkWise</title>
      
      
      
          <link id="page_favicon" href="/logo.svg" rel="icon" type="image/x-icon">
      
          <link href="https://fonts.googleapis.com/css?family=Montserrat:300,400,500,600,700" rel="stylesheet">
          <link href="https://fonts.googleapis.com/css?family=Rokkitt:100,300,400,700" rel="stylesheet">
      
          <link rel="stylesheet"
              href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />
      
          <!-- Animate.css -->
          <link rel="stylesheet" href="/user/css/animate.css">
          <!-- Icomoon Icon Fonts-->
          <link rel="stylesheet" href="/user/css/icomoon.css">
          <!-- Ion Icon Fonts-->
          <link rel="stylesheet" href="/user/css/ionicons.min.css">
          <!-- Bootstrap  -->
          <link rel="stylesheet" href="/user/css/bootstrap.min.css">
      
          <!-- Magnific Popup -->
          <link rel="stylesheet" href="/user/css/magnific-popup.css">
      
          <!-- Flexslider  -->
          <link rel="stylesheet" href="/user/css/flexslider.css">
      
          <!-- Owl Carousel -->
          <link rel="stylesheet" href="/user/css/owl.carousel.min.css">
          <link rel="stylesheet" href="/user/css/owl.theme.default.min.css">
      
          <!-- Date Picker -->
          <link rel="stylesheet" href="/user/css/bootstrap-datepicker.css">
          <!-- Flaticons  -->
          <link rel="stylesheet" href="/user/fonts/flaticon/font/flaticon.css">
      
          <!-- Theme style  -->
          <link rel="stylesheet" href="/user/css/style.css">
      
          <!-- Font Awesome -->
          <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet" />
          <!-- Google Fonts -->
          <link href="https://fonts.googleapis.com/css?family=Roboto:300,400,500,700&display=swap" rel="stylesheet" />
          <!-- MDB -->
          <link href="https://cdnjs.cloudflare.com/ajax/libs/mdb-ui-kit/6.4.0/mdb.min.css" rel="stylesheet" />
      
          <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
      
          <style>
              .gradient-custom {
                  /* fallback for old browsers */
                  background: #88C8BC;
      
                  /* Chrome 10-25, Safari 5.1-6 */
                  background: -webkit-linear-gradient(to top left, #224957, #88C8BC);
      
                  /* W3C, IE 10+/ Edge, Firefox 16+, Chrome 26+, Opera 12+, Safari 7+ */
                  background: linear-gradient(to top left, #224957, #88C8BC)
              }
      
              .card {
                  border-radius: 10px;
                  box-shadow: 0px 4px 8px rgba(0, 0, 0, 0.2);
              }
      
              #status {
                  border: 1px solid #000000;
                  border-radius: 5%;
                  cursor: default;
              }
      
              .dot {
      
                  position: relative;
                  display: inline-block;
                  cursor: pointer;
                  margin-right: 3px;
                  border-style: solid;
                  height: 10px;
                  width: 10px;
                  left: -4px;
                  top: 0px;
                  border-width: 0px;
                  border-color: rgb(255, 255, 255);
                  border-radius: 10px;
              }
          </style>
      </head>
      <body>
        <div class="modal fade" id="exampleModal_<%= order._id %>" tabindex="-1"
            aria-labelledby="exampleModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-lg">
            <div class="modal-content text-white"
                style="background-color: #88C8BC; border-radius: 10px;">
                <div class="modal-header border-bottom-0">
                    <button type="button" class="btn-close btn-close-white"
                        data-mdb-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body text-start px-4 pt-0 pb-4">
                    <div class="text-center">
                        <h5 class="mb-3">Order Status<%= order.status %>
                        </h5>
                        <h5 class="mb-5">Order ID :- <%= order.orderId %>
                        </h5>
                    </div>

                    <input type="hidden" id="orderId" value="<%= order._id %>">

                    <hr class="mb-4" style="background-color: #e0e0e0; opacity: 1;">

                <% productsArray[order._id].forEach((product,i)=> { %>
                    <!-- This div represents the content for a single product of the order -->
                    <div class="media">
                        <div class="sq align-self-center">
                            <img class="img-fluid my-auto align-self-center mr-2 mr-md-4 pl-0 p-0 m-0"
                                src="/productImages/<%= product.image[0] %>"
                                width="135" height="135" />
                        </div>
                        <div class="media-body my-auto text-right">
                            <div class="row my-auto flex-column flex-md-row">
                                <div class="col my-auto">
                                    <h6 class="mb-0">
                                        <%= product.productName %>
                                    </h6>
                                </div>

                                <div class="col my-auto">
                                    <h6 class="mb-0">&#8377;<%= product.price %>
                                    </h6>
                                </div>
                                <div class="col my-auto">
                                    <h6 class="mb-0">QTY: <%= order.products[i].quantity %>
                                    </h6>
                                </div>
                                <div class="col my-auto">
                                    <h6 class="mb-0"></h6>
                                </div>
                            </div>
                        </div>
                    </div>
                    <hr class="my-3">
                <% }); %>


                    <div class="container col-md-10">
                        <div class="row">
                            <div class="col-md-4">
                                <h5>Deivery Address :</h5>
                            </div>
                            <div class="col-md-8"></div>
                            <div class="col-md-2"></div>
                            <div class="col-md-9">
                                <div>
                                    <%= order.deliveryAddress %>
                                </div>
                            </div>
                        </div>
                    </div>

                    <hr class="my-3">

                    <div class="container col-md-10">

                    <% if (order.status=='Placed' ) { %>
                        <div class="progress"
                            style="height: 6px; border-radius: 16px;">
                            <div class="progress-bar" role="progressbar"
                                style="width: 10%; border-radius: 16px; background-color: skyblue;"
                                aria-valuenow="20" aria-valuemin="0"
                                aria-valuemax="100"></div>
                        </div>
                        <div class="d-flex justify-content-around mb-1">
                            <p class="text-muted mt-1 mb-0 small">Placed
                            </p>
                            <p class="text-muted mt-1 mb-0 small">
                                Shipped</p>
                            <p
                                class="text-muted mt-1 mb-0 small ms-xl-5">
                                Out for delivery</p>
                            <p
                                class="text-muted mt-1 mb-0 small ms-xl-5">
                                Delivered</p>
                        </div>
                    <% } else if (order.status=='Returned' ) { %>
                        <div class="progress"
                            style="height: 6px; border-radius: 16px;">
                            <div class="progress-bar"
                                role="progressbar"
                                style="width: 100%; border-radius: 16px; background-color: red;"
                                aria-valuenow="20" aria-valuemin="0"
                                aria-valuemax="100"></div>
                        </div>
                        <div
                            class="d-flex justify-content-around mb-1">
                            <p
                                class="text-muted mt-1 mb-0 small ms-xl-5">
                                Returned and Refunded</p>
                        </div>

                    <% } else if (order.status=='Cancelled' ) {%>
                        <div class="progress"
                            style="height: 6px; border-radius: 16px;">
                            <div class="progress-bar"
                                role="progressbar"
                                style="width: 100%; border-radius: 16px; background-color: red;"
                                aria-valuenow="20"
                                aria-valuemin="0"
                                aria-valuemax="100"></div>
                        </div>
                        <div
                            class="d-flex justify-content-around mb-1">
                            <p
                                class="text-muted mt-1 mb-0 small ms-xl-5">
                                Cancelled and Refunded</p>
                        </div>
                    <% } else if (order.status=='Shipped' ){ %>
                        <div class="progress"
                            style="height: 6px; border-radius: 16px;">
                            <div class="progress-bar"
                                role="progressbar"
                                style="width: 28%; border-radius: 16px; background-color: orange;"
                                aria-valuenow="20"
                                aria-valuemin="0"
                                aria-valuemax="100"></div>
                        </div>
                        <div
                            class="d-flex justify-content-around mb-1">
                            <p
                                class="text-muted mt-1 mb-0 small">
                                Placed</p>
                            <p
                                class="text-muted mt-1 mb-0 small">
                                Shipped</p>
                            <p
                                class="text-muted mt-1 mb-0 small ms-xl-5">
                                Out for delivery</p>
                            <p
                                class="text-muted mt-1 mb-0 small ms-xl-5">
                                Delivered</p>
                        </div>
                    <% } else if(order.status=='Out For Delivery' ) { %>
                        <div class="progress"
                            style="height: 6px; border-radius: 16px;">
                            <div class="progress-bar"
                                role="progressbar"
                                style="width: 60%; border-radius: 16px; background-color: #9bff84;"
                                aria-valuenow="20"
                                aria-valuemin="0"
                                aria-valuemax="100">
                            </div>
                        </div>
                        <div
                            class="d-flex justify-content-around mb-1">
                            <p
                                class="text-muted mt-1 mb-0 small">
                                Placed</p>
                            <p
                                class="text-muted mt-1 mb-0 small">
                                Shipped</p>
                            <p
                                class="text-muted mt-1 mb-0 small ms-xl-5">
                                Out for delivery</p>
                            <p
                                class="text-muted mt-1 mb-0 small ms-xl-5">
                                Delivered</p>
                        </div>
                    <% } else if
                        (order.status=='Delivered' )
                        { %>
                        <div class="progress"
                            style="height: 6px; border-radius: 16px;">
                            <div class="progress-bar"
                                role="progressbar"
                                style="width: 100%; border-radius: 16px; background-color: #01a801;"
                                aria-valuenow="20"
                                aria-valuemin="0"
                                aria-valuemax="100">
                            </div>
                        </div>
                        <div
                            class="d-flex justify-content-around mb-1">
                            <p
                                class="text-muted mt-1 mb-0 small">
                                Placed</p>
                            <p
                                class="text-muted mt-1 mb-0 small">
                                Shipped</p>
                            <p
                                class="text-muted mt-1 mb-0 small ms-xl-5">
                                Out for delivery</p>
                            <p
                                class="text-muted mt-1 mb-0 small ms-xl-5">
                                Delivered</p>
                        </div>
                     
                        
                      <% } %>

                    </div>

                    <hr class="my-3">
                    <% if (order.status == 'Delivered') { %>
                        <div class="text-center">
                            <button id="downloadButton" class="btn btn-secondary">Download Invoice</button>
                        </div>
                    <% } %>
                </div>
            </div>
            </div>
                                        </div>
        </body>
        </html>
      `;

      // Inject the HTML template into the page
      await page.setContent(template);

      // Generate PDF
      const pdfBuffer = await page.pdf({
         format: 'A4',
         printBackground: true,
      });

      await browser.close();

      res.setHeader('Content-Disposition', 'attachment; filename="invoice.pdf"');
      res.setHeader('Content-Type', 'application/pdf');
      res.send(pdfBuffer);
   } catch (error) {
      console.error('PDF generation error:', error);
      res.status(500).send('An error occurred during PDF generation.');
   }
};





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

}