# walkwise-ecommerce
Welcome to the WalkWise E-commerce Website repository! This project is an online shopping platform designed to provide customers with a seamless and secure shopping experience. It offers a wide range of products with features like user authentication, product browsing, shopping cart, payment integration, and more.
# WalkWise E-commerce Website

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Usage](#usage)
- [Technologies Used](#technologies-used)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)

## Features

- User registration and login with authentication.
- Stores the user data in the mongoDB colllections.
- User verification with OTP using OTPgenerator and nodeMailer.
- Browse products by categories and search functionality.
- Filter the products by price, category, and brand.
- Add products to the shopping cart and manage items in the cart.
- Secure payment integration using Razorpay.
- Admin panel to manage products, categories, orders and other features.
- Export order data to PDF using PDFKit.
- Export order data to EXCEL using EXCELJS.
- Image upload and management with Multer.
- Responsive design for mobile and desktop.

## Installation

To run the WalkWise E-commerce website locally, follow these steps:

1. Clone this repository to your local machine:

   ```bash
   git clone https://github.com/yourusername/walkwise-ecommerce.git
2.Open your porjct directory :
  cd walkwise-ecommerce

3. Install all the neccessery dependencies:
  npm install

4. Create a '.env' file with the following variables:

   PORT = 3000 
   SESSION_SECRET = your session secret
   RAZOR_KEY_ID = your razor pay key id
   RAZOR_SECRET = your razor pay secret
   DATABASE= the database connection
   NODEMAILER_EMAIL = Email Which app is generated
   NODEMAILER_PASS = Password of the generated app
   ADMIN_EMAIL = optional Emails
   ADMIN_PASS = your admin password

5. To start the server:
   npm start.

6. Accessing the page:
   Visit http://localhost:3000 in your web browser to access the website.

Usages :
1.Register as a new user by confirming the otp and log in with your credentials.
2.Explore the product categories and use the search bar to find specific items.
3.Add products to your shopping cart and proceed to checkout.
4.Complete the payment process using Razorpay or cod.

Technologies Used:
  Node.js
  Express.js
  MongoDB
  EJS (Embedded JavaScript)
  Cloudinary (Image upload and management)
  Razorpay (Payment integration)
  Nodemailer (Email sending)
  PDFKit (PDF generation)
  And other various Node.js packages.


Contributing.
    Contributions to the WalkWise E-commerce website are welcome! If you find any bugs, have feature requests, or want to improve the code, feel free to open issues or submit pull requests. Let's build this project together!


Contact
If you have any questions or inquiries, feel free to contact us at:

GitHub: github.com/fazil8848
Linked In: https://www.linkedin.com/in/fazil-faz-135255286/




