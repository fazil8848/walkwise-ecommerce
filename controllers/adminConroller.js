const User = require("../models/userModels");
const Products = require('../models/productModels');
const Categories = require('../models/categoryModels');
const Orders = require('../models/orderModel')
const Coupons = require('../models/couponsModel');
const exceljs = require('exceljs');

// Login -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-

const loadLogin = async (req, res) => {

    try {

        res.render('login');

    } catch (error) {
        console.log(' the error is on admins loadLogin method :-- ', error.message);
    }
};


const verifyLogin = async (req, res) => {

    try {

        const email = req.body.email;
        const password = req.body.password;

        if (!email || !password) {

            return res.render('login', { message: " Please fill out all the fields " });

        }

        if (email == process.env.ADMIN_EMAIL && password == process.env.ADMIN_PASS) {

            req.session.email = email;
            res.redirect('admin/home');

        } else {
            res.render('login', { message: 'Email or password is incorrect' })
        }

    } catch (error) {
        console.log('error is on admins verifyLogin method :-  ', error.message);
    }
}

// home ----=-=-=-=-=-=-=-=-=-=-=-=----

const loadHome = async (req, res) => {
    try {
        const date = new Date();
        const coupons = await Coupons.find();
        if (coupons) {

            for (const coupon of coupons) {
                if (coupon.valid_to < date && coupon.status == true) {
                    const updated = await Coupons.findByIdAndUpdate(coupon._id, {
                        $set: { status: false },
                    });
                    if (updated) {
                        console.log("coupon updated");
                    }
                }
            }

        }


        const orderData = await Orders.find({ status: { $eq: 'Delivered' } });

        let totalSales = 0;
        orderData.forEach((order) => {
            totalSales += order.totalPrice;
        });

        const cod = await Orders.find({ paymentMethod: 'cod' }).count();
        const online = await Orders.find({ paymentMethod: 'razorpay' }).count();
        const year = date.getFullYear();
        const yearStart = new Date(year, 0, 1);

        const monthlySale = await Orders.aggregate([
            {
                $match: {
                    orderDate: { $gte: yearStart },
                    status: { $eq: 'Delivered' },
                },
            },
            {
                $group: {
                    _id: { $dateToString: { format: '%m', date: '$orderDate' } },
                    total: { $sum: '$totalPrice' },
                    count: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
        ]);

        let monthlyChart = Array.from({ length: 12 }, () => ({ _id: 0, total: 0, count: 0 }));

        for (let i = 0; i < monthlySale.length; i++) {
            const monthIndex = Number(monthlySale[i]._id) - 1;
            monthlyChart[monthIndex] = monthlySale[i];
        }

        const totalProducts = await Products.find().count();

        const totalOrders = await Orders.find().count();

        const totalUsers = await User.find().count();


        res.render('home', {
            totalProducts,
            totalUsers,
            totalOrders,
            orderData,
            totalSales,
            cod,
            online,
            monthlyChart,
        });
    } catch (error) {
        console.log('loadHome method :- ', error.message);
    }
};


const logout = async (req, res) => {
    try {
        req.session.destroy();
        res.redirect('/admin');
    } catch (error) {
        console.log('admin logout function :- ', error.message);
    }
};


// user manager -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
const manageUser = async (req, res) => {
    try {
        const usersData = await User.find({});
        if (usersData) {
            res.render('manageUsers', { user: usersData });
        } else {
        }

    } catch (error) {
        console.log("loadDashboard methode :- ", error.message);
    }
}

const blockUser = async (req, res) => {

    try {

        const userId = req.query.id;
        const userData = await User.findOne({ _id: userId });

        if (userData) {
            await User.updateOne({ _id: userData._id }, { $set: { is_blocked: 1 } });
            res.redirect('/admin/manageUsers');
        } else {
            console.log('error in blocking the user');
        }

    } catch (error) {
        console.log("blockUser methode :-  ", error.message);
    }

}

const unblockUser = async (req, res) => {

    try {

        const userId = req.query.id;
        const userData = await User.findOne({ _id: userId });

        if (userData) {
            await User.updateOne({ _id: userData._id }, { $set: { is_blocked: 0 } });
            res.redirect('/admin/manageUsers');
        } else {
            console.log('error in unblocking the user');
        }

    } catch (error) {
        console.log(" unblockUser methode :-  ", error.message);
    }

}

// Products -=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-
const productManager = async (req, res) => {

    try {

        const productData = await Products.find({}).populate('category');

        res.render('manageProducts', { products: productData })

    } catch (error) {
        console.log('productManager method :- ', error.message);
    }

}

const loadAddProducts = async (req, res) => {

    try {

        const category = await Categories.find()
        res.render('addProductsForm', { category })

    } catch (error) {
        console.log("loadAddproducts method :-  ", error.message);
    }

}

const addProducts = async (req, res) => {

    try {

        const { productName, brand, price, size, stockedOn, quantity, category, description } = req.body;
        if (!productName || !brand || !price || !size || !stockedOn || !quantity || !category || !description) return res.render('addProductsForm', { message: "Please fill out all the fields" });

        const img = req.files.map((i) => i.filename);
        const products = new Products({
            productName: productName,
            brand: brand,
            price: price,
            size: size,
            stocked_on: stockedOn,
            quantity: quantity,
            category: category,
            description: description,
            image: img
        });

        const productData = await products.save()

        if (productData) {
            res.redirect('manageProducts')
        } else {
            res.render('addProductsForm', { messageFailed: 'Adding products failed' });
        }


    } catch (error) {
        console.log("addProducts method", error.message);
    }

}

const loadEditProducts = async (req, res) => {

    try {

        const categoryData = await Categories.find().lean();
        const id = req.query.id;
        const productData = await Products.findOne({ _id: id }).lean();

        if (productData) {

            res.render("editProducts", {
                products: productData,
                category: categoryData
            });

        } else {
        }

    } catch (error) {
        console.log('Load edit products :- ', error.message);
    }

}

const editProduct = async (req, res) => {
    try {
        const id = req.body.Id;
        const { productName, brand, price, size, stockedOn, quantity, category, description } = req.body;
        let img = [];

        if (req.files && req.files.length > 0) {
            const existingProduct = await Products.findById(id);
            let images = existingProduct ? existingProduct.image : [];

            req.files.forEach((file) => {
                if (images.length < 5) {
                    images.push(file.filename);
                }
            });

            img = images;
        }

        await Products.findByIdAndUpdate(id, {
            productName: productName,
            brand: brand,
            price: price,
            size: size,
            stocked_on: stockedOn,
            quantity: quantity,
            category: category,
            description: description,
            image: img
        });

        res.redirect('/admin/manageProducts');
    } catch (error) {
        console.log('editProducts admin Method:', error.message);
    }
};


const hideProducts = async (req, res) => {

    try {

        const id = req.query.id;
        const data = await Products.findById({ _id: id });

        if (data.is_hidden) {

            await Products.findOneAndUpdate({ _id: id }, { $set: { is_hidden: false } });
            res.redirect("/admin/manageProducts");


        } else {

            await Products.findOneAndUpdate({ _id: id }, { $set: { is_hidden: true } });

            res.redirect("/admin/manageProducts");

        }

    } catch (error) {
        console.log('hide Products method :- ', error.message);
    }

}

const removeImage = async (req, res) => {

    try {

        let id = req.body.id;
        let position = req.body.position;
        let product = await Products.findById(id);
        let image = product.image[position];
        await Products.updateOne({ _id: id }, { $pullAll: { image: [image] } });
        res.json({ remove: true });

    } catch (error) {
        console.log('remove image  :- ', error.message);
    }

}

const updateStock = async (req, res) => {

    try {

        const id = req.body.id;
        const stock = req.body.stock;

        await Products.findByIdAndUpdate(id,
            { quantity: stock }
        )

        res.redirect("/admin/manageProducts");

    } catch (error) {
        console.log('updateStock Method :-  ', error.message);
    }

}


const loadSales = async (req, res) => {

    try {

        let from;
        let to;
        req.query.from ? (from = new Date(req.query.from)) : (from = 'ALL');
        req.query.from ? (to = new Date(req.query.to)) : (to = 'ALL');
        if (from != 'ALL' && to != 'ALL') {

            const orders = await Orders.aggregate([
                {
                    $match: {
                        $and: [
                            { orderDate: { $gte: from } },
                            { orderDate: { $lte: to } },
                            { status: { $eq: 'Delivered' } }
                        ]
                    }
                }
            ]);
            res.render('salesReport', {
                orders
            })

        } else {

            const orders = await Orders.find({ status: 'Delivered' });

            res.render('salesReport', {
                orders
            })

        }



    } catch (error) {
        console.log('loadSales Method :-  ', error.message);
    }

}

const salesReportDownload = async (req, res) => {

    try {

        const salesData = await Orders.find({}, 'orderDate products paymentMethod totalPrice user').populate('user');

        const workbook = new exceljs.Workbook();
        const worksheet = workbook.addWorksheet('Sales Report');

        worksheet.addRow(['Order Date', 'Product Count', 'Payment Method', 'Total Price', 'User']);

        salesData.forEach((sale) => {
            const productNameList = sale.products.map((product) => product.product_id.name).join(', ');

            // Access the 'userName' directly from the 'user' field
            const userName = sale.user ? sale.user.userName : 'Unknown';

            worksheet.addRow([sale.orderDate.toLocaleDateString(), sale.products.length, sale.paymentMethod, sale.totalPrice, userName]);
        });

        worksheet.columns.forEach((column) => {
            if (column.header) {
                column.width = Math.max(12, column.header.length + 2);
            } else {
                column.width = 15;
            }
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=sales_report.xlsx');

        await workbook.xlsx.write(res);

        res.end();

    } catch (error) {
        console.log('salesReportDownload Method :-  ', error.message);
    }

}

const PDFDocument = require('pdfkit');

const salesReportDownloadPdf = async (req, res) => {
    try {
        const salesData = await Orders.find({}, 'orderDate products paymentMethod totalPrice user').populate('user');

        // Create a new PDF document
        const doc = new PDFDocument();

        // Set the response headers for PDF download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename=sales_report.pdf');

        // Pipe the PDF document to the response stream
        doc.pipe(res);

        // Add content to the PDF
        doc.font('Helvetica-Bold').fontSize(14).fillColor('black').text('Sales Report', { align: 'center' });
        doc.moveDown();

        // Table formatting variables
        const tableTop = 100;
        const tableLeft = 30;
        const colWidth = 110;
        const rowHeight = 30;
        const headerRowHeight = 30;
        const maxRowsPerPage = 20;

        doc.font('Helvetica-Bold').fontSize(12).fillColor('white');
        doc.rect(tableLeft, tableTop, 5 * colWidth, headerRowHeight).fillAndStroke('#000000', '#000000');
        doc.text('Order Date', tableLeft, tableTop + 10, { width: colWidth, height: headerRowHeight, align: 'center' });
        doc.text('Product Count', tableLeft + colWidth, tableTop + 10, { width: colWidth, height: headerRowHeight, align: 'center' });
        doc.text('Payment Method', tableLeft + 2 * colWidth, tableTop + 10, { width: colWidth, height: headerRowHeight, align: 'center' });
        doc.text('Total Price', tableLeft + 3 * colWidth, tableTop + 10, { width: colWidth, height: headerRowHeight, align: 'center' });
        doc.text('User', tableLeft + 4 * colWidth, tableTop + 10, { width: colWidth, height: headerRowHeight, align: 'center' });
        doc.fillColor('black');

        const drawTableRows = (data, startY) => {
            let y = startY;
            data.forEach((sale, index) => {
                if (index % maxRowsPerPage === 0 && index !== 0) {
                    doc.addPage();
                    doc.font('Helvetica-Bold').fontSize(12).fillColor('white');
                    doc.rect(tableLeft, tableTop, 5 * colWidth, headerRowHeight).fillAndStroke('#000000', '#000000');
                    doc.text('Order Date', tableLeft, tableTop + 10, { width: colWidth, height: headerRowHeight, align: 'center' });
                    doc.text('Product Count', tableLeft + colWidth, tableTop + 10, { width: colWidth, height: headerRowHeight, align: 'center' });
                    doc.text('Payment Method', tableLeft + 2 * colWidth, tableTop + 10, { width: colWidth, height: headerRowHeight, align: 'center' });
                    doc.text('Total Price', tableLeft + 3 * colWidth, tableTop + 10, { width: colWidth, height: headerRowHeight, align: 'center' });
                    doc.text('User', tableLeft + 4 * colWidth, tableTop + 10, { width: colWidth, height: headerRowHeight, align: 'center' });
                    doc.fillColor('black');
                    y = tableTop + headerRowHeight;
                }

                const userName = sale.user ? sale.user.userName : 'Unknown';

                doc.rect(tableLeft, y, colWidth, rowHeight).stroke();
                doc.text(sale.orderDate.toLocaleDateString(), tableLeft, y + 5, { width: colWidth, height: rowHeight, align: 'center' });

                doc.rect(tableLeft + colWidth, y, colWidth, rowHeight).stroke();
                doc.text(sale.products.length.toString(), tableLeft + colWidth, y + 5, { width: colWidth, height: rowHeight, align: 'center' });

                doc.rect(tableLeft + 2 * colWidth, y, colWidth, rowHeight).stroke();
                doc.text(sale.paymentMethod, tableLeft + 2 * colWidth, y + 5, { width: colWidth, height: rowHeight, align: 'center' });

                doc.rect(tableLeft + 3 * colWidth, y, colWidth, rowHeight).stroke();
                doc.text(sale.totalPrice.toString(), tableLeft + 3 * colWidth, y + 5, { width: colWidth, height: rowHeight, align: 'center' });

                doc.rect(tableLeft + 4 * colWidth, y, colWidth, rowHeight).stroke();
                doc.text(userName, tableLeft + 4 * colWidth, y + 5, { width: colWidth, height: rowHeight, align: 'center' });

                y += rowHeight;
            });
            return y;
        };

        let startY = tableTop + headerRowHeight;
        let remainingRows = salesData.length;

        // Draw the table rows
        startY = drawTableRows(salesData, startY);

        // Finalize the PDF document
        doc.end();
    } catch (error) {
        console.log('salesReportDownload Method: ', error.message);
    }
};







module.exports = {

    loadLogin,
    verifyLogin,
    loadHome,
    logout,
    manageUser,
    blockUser,
    unblockUser,
    productManager,
    loadAddProducts,
    addProducts,
    loadEditProducts,
    editProduct,
    hideProducts,
    removeImage,
    updateStock,
    loadSales,
    salesReportDownload,
    salesReportDownloadPdf,

}



















