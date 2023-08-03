const Banner = require('../models/bannerMode');


const loadBanners = async (req, res) => {

    try {

        const banners = await Banner.find();
        res.render('banner', { banners })

    } catch (error) {
        console.log('loaddBanners Method :-  ', error.message);
        res.render('404');
    }

}

const loadAddBanner = async (req, res) => {

    try {

        res.render("addBanners");

    } catch (error) {
        console.log('loadAddBanner Method :-  ', error.message);
        res.render('404');
    }

}

const addBanner = async (req, res) => {

    try {

        const { heading, description } = req.body
        const image = req.file.filename;

        if (!heading || !description) return req.render('addBanners',{ message: 'Please Fill all the fields' });

        const data = new Banner(
            {
                heading,
                description,
                image
            }
        );

        const result = await data.save();
        
        if (result) return res.redirect('banners')

    } catch (error) {
        console.log('addBanner Method :-  ', error.message);
    }

}


module.exports = {
    loadAddBanner,
    loadBanners,
    addBanner

}