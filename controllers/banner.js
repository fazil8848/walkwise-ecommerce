const Banner = require('../models/bannerMode');


const loadBanners = async (req, res) => {

    try {

        const banners = await Banner.find();
        res.render('banner', { banners })

    } catch (error) {
        console.log('loaddBanners Method :-  ', error.message);
    }

}

const loadAddBanner = async (req, res) => {

    try {

        res.render("addBanners");

    } catch (error) {
        console.log('loadAddBanner Method :-  ', error.message);
    }

}

const addBanner = async (req, res) => {

    try {

        const { heading, description } = req.body
        const image = req.file.filename;

        if (!heading || !description) return req.render('addBanners', { message: 'Please Fill all the fields' });

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

const hideBanner = async (req, res) => {

    try {

        const bannerId = req.query.id;
        const banner = await Banner.findById(bannerId);


        if (banner) {

            if (banner.status) {

                await Banner.findByIdAndUpdate(bannerId, {
                    $set: { status: false }
                })
                res.redirect('banners');
                return;

            } else {

                await Banner.findByIdAndUpdate(bannerId, {
                    $set: { status: true }
                })
            }
            res.redirect('banners')
            return;

        } else {
            console.log('error finding banner');
            }

    } catch (error) {
        console.log('hideBanner Method :-  ', error.message);
    }

}

const deleteBanner = async (req,res) => {

    try {

        const deleted = await Banner.findByIdAndDelete(req.query.id);
        if (deleted) {
           return res.redirect('banners')
        } 

    } catch (error) {
        console.log('deleteBanner Method :-  ',error.message);
    }

}


module.exports = {
    loadAddBanner,
    loadBanners,
    addBanner,
    hideBanner,
    deleteBanner,

}