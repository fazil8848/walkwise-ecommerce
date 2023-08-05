const User = require('../models/userModels');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const cookieParser = require('cookie-parser');
const Product = require('../models/productModels');
const otpGen = require('./OTPcontroller.js');
const Cart = require('../models/cartModel');
const Coupons = require('../models/couponsModel');
const Orders = require('../models/orderModel');
const Category = require('../models/categoryModels');
const Banners = require('../models/bannerMode');


const express = require('express');
const app = express();

app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));



const securePassword = async (password) => {
   try {
      const saltRounds = 10;
      const passwordHash = bcrypt.hashSync(password, saltRounds);
      return passwordHash;
   } catch (error) {
      console.log(error.message);
      throw error;
   }
};


//for sending mail -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

const sendOTP = async (name, email, otp,) => {
   try {

      const transporter = nodemailer.createTransport({
         host: "smtp.gmail.com",
         port: 465,
         secure: true,
         auth: {
            user: process.env.NODEMAILER_EMAIL,
            pass: process.env.NODEMAILER_PASS
         }
      });

      const mailOptions = {
         from: process.env.NODEMAILER_EMAIL,
         to: email,
         subject: 'Your OTP',
         text: `WELCOME TO FOOTWEAR SHOPPING PLATFORM.\n \n Your OTP IS \n\n ${otp}`,
      };

      transporter.sendMail(mailOptions, (error, info) => {
         if (error) {
            console.log(error);
         } else {
            console.log(" Email has been sent ", info.response);
         }
      });

   } catch (error) {
      console.log("error is on sendOTP method", error.message);
   }
}

//   SIGNUP with OTP _-`_-`_-`_-`_-`_-`_-`_-`_-`_-`_-`

const OTP = otpGen();


const loadSignup = async (req, res) => {
   try {
      res.render('signup');
   } catch (error) {
      console.log(error.message);
      res.render('404')
   }
};

const insertUser = async (req, res) => {

   try {

      let userData;
      userData = {
         firstName: req.body.firstName,
         lastName: req.body.lastName,
         userName: req.body.userName,
         email: req.body.email,
         phone: req.body.phone,
         password: req.body.password,
      };

      req.session.userData = userData;

      if (!req.body.firstName || !req.body.lastName || !req.body.userName || !req.body.email || !req.body.phone || !req.body.password || !req.body.re_pass) return res.render('signup', { messageFailed: " Please fill ou all the fields " });

      if (req.body.re_pass !== req.body.password) {
         return res.render('signup', { messageFailed: " Please enter matching passwords " });
      }

      const isNewName = await User.isExistingUserName(req.body.userName);
      if (!isNewName) return res.render('signup', { messageFailed: "Existing Username" })

      const isNewEmail = await User.isExistingEmail(req.body.email);
      if (!isNewEmail) return res.render('signup', { messageFailed: 'Existing Email address. Please try to Log - In' });

      req.session.otp = OTP;
      sendOTP(userData.userName, userData.email, OTP);
      res.redirect('/otp');

   } catch (error) {
      console.log('in insertUser method', error.message);
      res.render('404')
   }

}


const loadOTP = async (req, res) => {

   try {

      res.render('otp', { email: req.session.email });
      console.log(OTP);

   } catch (error) {
      console.log('loadOTP method', error.message);
      res.render('404')
   }
};

const resendOTP = async (req, res) => {

   try {

      sendOTP(req.session.userData.userName, req.session.userData.email, OTP);

   } catch (error) {
      console.log('resendOtp method', error.message);
      res.render('404')
   }

};

const verifyOTP = async (req, res) => {

   try {

      const { val1, val2, val3, val4, val5, val6 } = req.body;

      const formOtp = Number(val1 + val2 + val3 + val4 + val5 + val6);

      if (formOtp == OTP) {
         const { firstName, lastName, userName, email, phone, password } = req.session.userData;

         const secPassword = await securePassword(password);
         const user = new User({

            firstName: firstName,
            lastName: lastName,
            phone: phone,
            userName: userName,
            email: email,
            password: secPassword,

         });

         const userData = await user.save();

         if (userData) {
            res.render('login', { message: 'Registration Success' });
         } else {
            res.render('signup', { messageFailed: 'Registarion Failed' })
         }
      } else {
         res.render('signup', { messageFailed: 'Incorrect OTP' })
      }

   } catch (error) {
      console.log('in VerifyOTP:- ', error.message);
      res.render('404')
   }

};




// login user methods

const loadLogin = async (req, res) => {

   try {

      let bMessage;
      if (req.session.blockedMessage) {
         bMessage = req.session.blockedMessage;
         req.session.blockedMessage = null;
      }

      res.render('login', { message: bMessage });

   } catch (error) {
      console.log(error.message)
      res.render('404')
   }

}



const verifyLogin = async (req, res) => {

   try {
      const email = req.body.email;
      const password = req.body.password;

      if (!email || !password) return res.render('login', { message: " Please fill out all the fields " });

      const userData = await User.findOne({ email: email });

      if (userData) {

         if (userData.is_blocked == 1) return res.render('login', { message: " Your Acoount Is currently Blocked " });

         const isMatchingPassword = await bcrypt.compare(password, userData.password);

         if (isMatchingPassword) {

            req.session.user_id = userData._id;
            req.session.userData = userData;
            res.redirect('/home');

         } else {
            res.render('login', { message: 'Email or password is incorrect' });
         }
      } else {
         res.render('login', { message: 'Email or password is incorrect' });
      }
   } catch (error) {
      console.log(error);
      res.render('login', { message: 'An error occurred. Please try again.' });
   }
};

// Home -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

let length = 0;

const loadHome = async (req, res) => {
   try {

      const banner = await Banners.find();

      if (req.session.userData && req.session.userData._id) {
         const cart = await Cart.findOne({ user: req.session.userData._id });
         if (cart?.products) {
            length = cart.products.length;
            req.session.length = cart.products.length;
         }

         const date = new Date();
         const coupons = await Coupons.find();
         if (!coupons) return res.render('404');
         for (const coupon of coupons) {
            if (coupon.valid_to < date && coupon.status == true) {
               const updated = await Coupons.findByIdAndUpdate(coupon._id, {
                  $set: { status: false },
               })
               if (updated) {
                  console.log("coupon updated")
               }
            }
         }

      }

      const data = await Product.find({ is_hidden: false }).limit(16);
      if (!data) return res.render('404');

      res.render('home', {
         req: req,
         product: data,
         length: length,
         banner,
      });

   } catch (error) {
      console.log('loadHome Method: ', error.message);
      res.render('404')
   }
}

const loadShop = async (req, res) => {
   try {

      const category = await Category.find();

      const count = 9;
      const pageNo = parseInt(req.query.page) || 0;
      const skip = count * pageNo;

      if (req.session.userData && req.session.userData._id) {
         const cart = await Cart.findOne({ user: req.session.userData._id });
         if (cart?.products) {
            length = cart.products.length;
            req.session.length = cart.products.length;
         }
      }

      if (req.query.sort || req.query.brand || req.query.price || req.query.categories) {
         const { brand, price, categories, sort } = req.query;

         const filter = {};

         if (brand) {
            filter.brand = { $in: brand };
         }

         if (price) {
            const [minPrice, maxPrice] = price.split('-');
            filter.price = { $gte: Number(minPrice), $lte: Number(maxPrice) };
         }

         if (categories) {
            filter.category = { $in: categories };
         }

         filter.is_hidden = { $ne: true }

         let data;
         let dataCount;
         if (sort && sort == 1) {

            data = await Product.find(filter)
               .sort({ price: -1 })
               .skip(skip)
               .limit(count);

            dataCount = await Product.find(filter)
               .sort({ price: -1 })
               .skip(skip)
               .limit(count)
               .countDocuments();

         } else if (sort && sort == 2) {

            data = await Product.find(filter).sort({ price: 1 })
               .skip(skip)
               .limit(count);

            dataCount = await Product.find(filter).sort({ price: 1 })
               .skip(skip)
               .limit(count)
               .countDocuments();

         } else {

            data = await Product.find(filter)
               .skip(skip)
               .limit(count);

            dataCount = await Product.find(filter)
               .skip(skip)
               .limit(count)
               .countDocuments();
         }

         const totalPage = Math.ceil(dataCount / count);

         res.render('shop', {
            req: req,
            product: data,
            length: length,
            category: category,
            filtered: true,
            totalPage,
         });
      } else {

         const data = await Product.find({ is_hidden: { $ne: true } })
            .skip(skip)
            .limit(count);

         const dataCount = await Product.find({ is_hidden: { $ne: true } })
            .countDocuments();

         const totalPage = Math.ceil(dataCount / count);

         if (!data) return res.render('404');
         res.render('shop', {
            req: req,
            product: data,
            length: length,
            category: category,
            filtered: false,
            totalPage,

         });
      }

   } catch (error) {
      console.log('loadShop Method: ', error.message);
      res.render('404');
   }
};


const loadAbout = async (req, res) => {
   try {
      if (req.session.user_id) {
         const cart = await Cart.findOne({ user: req.session.user_id });
         if (cart?.products) {
            length = cart.products.length;
            req.session.length = cart.products.length;
         }
      }

      const data = await Product.find();
      if (!data) return res.render('404');

      res.render('about', {
         req: req,
         product: data,
         length: length
      });
   } catch (error) {
      console.log('loadAbout Method: ', error.message);
      res.render('404')
   }
}

const loadContacts = async (req, res) => {
   try {
      if (req.session.user_id) {
         const cart = await Cart.findOne({ user: req.session.user_id });
         if (cart?.products) {
            length = cart.products.length;
            req.session.length = cart.products.length;
         }
      }

      const data = await Product.find();
      if (!data) return res.render('404');

      res.render('contact', {
         req: req,
         product: data,
         length: length
      });
   } catch (error) {
      console.log('loadContacts Method: ', error.message);
      res.render('404')
   }
}




// logout  -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
const userLogout = async (req, res) => {

   try {

      req.session.destroy();
      res.redirect('/login');

   } catch (error) {
      console.log('Logout Method :-  ', error.message);
      res.render('404')
   }

}

const singleProduct = async (req, res) => {

   try {
      const id = req.query.id;
      const data = await Product.findById(id).populate("category");
      if (!data) return res.render('404');


      let added = false;
      if (req.session.userData) {
         const userId = req.session.userData._id;
         const userCart = await Cart.findOne({ user: userId });

         if (userCart && userCart.products) {
            length = userCart.products.length;
            const productExists = userCart.products.findIndex((product) =>
               product.product_id.equals(id)
            );
            added = productExists !== -1; // Check if index is found
         }
      }

      if (data) {
         res.render("product-detail", {
            product: data,
            req: req,
            added: added,
            length: length,
         });
      } else {
         res.render('404')
      }
   } catch (error) {
      console.log("singleProduct:", error.message);
      res.render('404')
   }
};



// User Profile ---=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=---

const loadProfile = async (req, res) => {

   try {

      const userData = req.session.userData;
      const orderLength = await Orders.find({ user: userData._id }).count();

      const user = await User.findOne({ email: userData.email });

      res.render('profile', {
         user: user,
         req: req,
         length,
         orderLength,
      })

   } catch (error) {
      console.log("LoadProfile Method :- ", error.message);
      res.render('404')
   }

};


const loadAddressList = async (req, res) => {

   try {

      const userData = req.session.userData;

      const user = await User.findOne({ email: userData.email });
      const address = user.address;

      if (address.length) {

         res.render('addressList', {
            user,
            address,
            req,
            length
         });

      } else {
         res.render('addressList', { user, data: 1, req });
      }


   } catch (error) {
      console.log('loadAddressList Method :-  ', error.message);
      res.render('404')
   }

}

const loadAddAddress = async (req, res) => {

   try {

      res.render('add-address', { req: req })

   } catch (error) {
      console.log('loadAddAddress Method :-  ', error.message);
      res.render('404')
   }

};

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
         res.redirect('/addressList')

      } else {
         res.redirect('/login');;
      }

   } catch (error) {
      console.log('addAddress Method :-  ', error.message);
      res.render('404')
   }
};

const loadEditAddress = async (req, res) => {
   try {
      if (req.session.userData._id) {
         const address = await User.findOne({
            _id: req.session.userData._id,
            'address._id': req.query.id
         }).lean();
         const data = address.address.find(a => a._id.toString() === req.query.id);
         if (!coupons) retdata.render('404');
         res.render
            ('edit-address', { req: req, data: data });
      } else {
         res.redirect('/login');;
      }
   } catch (error) {
      console.log('loadEditAddress Method: ', error.message);
      res.render('404')
   }
};

const editAddress = async (req, res) => {

   try {

      if (req.session.userData._id) {

         const { firstName, lastName, address, street, state, city, zipCode, phone, type, country } = req.body;

         if (!firstName || !lastName || !address || !street || !state || !city || !zipCode || !phone || !type || !country) return res.render('edit-address', { req, message: 'please Fill all the fields' })

         const addressId = req.body.id;
         const userId = req.session.userData._id;
         const userData = await User.findOne({ _id: userId, 'address._id': addressId });

         await User.updateOne(
            { _id: userId, "address._id": addressId },
            {
               $set: {
                  "address.$.firstName": firstName,
                  "address.$.lastName": lastName,
                  "address.$.address": address,
                  "address.$.phone": phone,
                  "address.$.city": city,
                  "address.$.street": street,
                  "address.$.state": state,
                  "address.$.zipCode": zipCode,
                  "address.$.type": type,
                  "address.$.country": country,
               }
            }
         );
         res.redirect('/addressList');
      } else {
         res.redirect('/login');;
      }

   } catch (error) {
      console.log('editAddress Method :-  ', error.message);
      res.render('404')
   }

};


const deleteAddress = async (req, res) => {

   try {

      if (req.session.userData._id) {

         const userId = req.session.userData._id;
         const addressId = req.query.id;

         await User.updateOne(
            { _id: userId },
            {
               $pull: {
                  address: {
                     _id: addressId,
                  }
               }
            }
         );
         res.redirect('/addressList')

      } else {
         res.redirect('/login');
      }

   } catch (error) {
      console.log('deleteAddress Method :-  ', error.message);
      res.render('404')
   }

};

const loadUpdateData = async (req, res) => {

   try {

      if (req.session.userData._id) {

         const userId = req.session.userData._id;
         const userData = await User.findById(userId);

         res.render('updateProfile', { user: userData, req: req, length })

      } else {
         res.redirect('/login');;
      }

   } catch (error) {
      console.log('getUpdateData Method :-  ', error.message);
      res.render('404')
   }

}

const updateData = async (req, res) => {
   try {

      const userId = req.session.userData._id;
      const { firstName, lastName, userName, email, phone } = req.body

      const data = await User.findByIdAndUpdate(userId, {
         $set: { firstName: firstName, lastName: lastName, userName: userName, email: email, phone: phone },
      });
      if (data) {
         res.redirect("/userProfile");
      }
   } catch (error) {
      console.log(error.message);
      res.render('404')
   }
};

const loadChangePass = async (req, res) => {

   try {

      const userId = req.session.userData._id;
      const userData = await User.findById(userId);

      res.render('changepassword', { req: req, user: userData, length });

   } catch (error) {
      console.log('loadChangePass Method :-  ', error.message);
      res.render('404')
   }

};

const changePass = async (req, res) => {
   try {
      const userId = req.session.userData._id;
      const userData = await User.findById(userId);

      if (!userData) {
         return res.render('404').send('User not found');
      }

      const { oldPassword, newPass, rePass } = req.body;

      if (!oldPassword || !newPass || !rePass) {
         return res.render('changepassword', {
            req: req,
            user: userData,
            message: 'Please fill in all the fields',
            length,
         });
      }

      if (newPass !== rePass) {
         return res.render('changepassword', {
            req: req,
            user: userData,
            message: 'Please enter matching passwords',
            length,
         });
      }

      const isMatchingPass = await bcrypt.compare(oldPassword, userData.password);
      if (isMatchingPass) {
         const secPassword = await securePassword(newPass);
         await User.updateOne({ _id: userId }, { $set: { password: secPassword } });
         // You may want to redirect or send a success response here
         return res.status(200).send('Password changed successfully');
      } else {
         return res.render('changepassword', {
            req: req,
            user: userData,
            message: 'Please enter the correct password',
            length,
         });
      }
   } catch (error) {
      console.log('changePass Method:', error.message);
      res.render('404')
      return res.status(500).send('Internal Server Error');
   }
};

const loadForgotPass = async (req, res) => {

   try {

      res.render('forgotPass', { req: req, length });

   } catch (error) {
      console.log('loadForgotPass Method :-  ', error.message);
      res.render('404')
   }

};


const forgotPass = async (req, res) => {

   try {



      const email = req.body.email
      const user = await User.findOne({ email: email });


      if (user) {

         sendOTP(user.userName, user.email, OTP);
         req.session.fotp = OTP;
         req.session.femail = email;

         res.render('forgototp', { message: "otp send successfully", length });

      } else {
         res.render('forgotPass', { req: req, message: 'Not an existing Email' });
      }

   } catch (error) {
      console.log('forgotPass Method :-  ', error.message);
      res.render('404')
   }

};

const verifyFotp = async (req, res) => {

   try {

      const { val1, val2, val3, val4, val5, val6 } = req.body;

      const formOtp = Number(val1 + val2 + val3 + val4 + val5 + val6);

      const otp = req.session.fotp;

      if (formOtp == otp) {
         res.render('updatePass', { req: req, message: 'OTP verification Successful' })
      } else {
         res.render('forgototp', { message: "Incrorrect OTP" })
      }

   } catch (error) {
      console.log('verifyFOtp Method :-  ', error.message);
      res.render('404')
   }

};

const updatePass = async (req, res) => {

   try {

      const { newPass, rePass } = req.body;


      if (!newPass || !rePass) {
         return res.render('updatePass', {
            req: req,
            message: 'Please fill in all the fields',
            length
         });
      };

      if (newPass !== rePass) {
         return res.render('changepassword', {
            req: req,
            message: 'Please enter matching passwords',
            length
         });
      };

      const secPass = await securePassword(newPass);
      const email = req.session.femail;

      const user = await User.updateOne(
         { email: email },
         {
            $set: {
               password: secPass
            }
         }
      );
      if (user) {
         req.session.destroy();
         res.redirect('/login');;
         console.log('Pass word updated succesfully ');
      } else {
         console.log('error while updating pass');
      }

   } catch (error) {
      console.log('updatePass Method :-  ', error.message);
      res.render('404')
   }

}

const search = async (req, res) => {

   try {

      const category = await Category.find();
      const searchKey = req.body.searchKey
      if (searchKey) {

         const product = await Product.find({
            "$or": [
               { productName: { $regex: new RegExp(searchKey, 'i') } },
               { brand: { $regex: new RegExp(searchKey, 'i') } }
            ]
         });

         res.render('shop',
            {
               req,
               length,
               category,
               filtered: false,
               product,

            }
         );

      } else {

         const product = await Product.find();

         res.render('shop',
            {
               req,
               length,
               category,
               filtered: false,
               product,

            }
         );

      }


   } catch (error) {
      console.log('search Method :-  ', error.message);
   }

}







module.exports = {

   loadSignup,
   insertUser,
   loadOTP,
   loadLogin,
   verifyLogin,
   loadHome,
   userLogout,
   resendOTP,
   verifyOTP,
   singleProduct,
   loadProfile,
   loadAddressList,
   loadAddAddress,
   addAddress,
   loadEditAddress,
   editAddress,
   deleteAddress,
   loadUpdateData,
   updateData,
   loadChangePass,
   changePass,
   loadForgotPass,
   forgotPass,
   verifyFotp,
   updatePass,
   loadShop,
   loadAbout,
   loadContacts,
   search,

};





