const { name } = require('ejs');
const Categories = require('../models/categoryModels');




const loadCategory = async (req, res) => {

    try {

        const data = await Categories.find();
        if (!data) return res.render('404');

        res.render("category", { category: data });

    } catch (error) {
        console.log('loadCategory method : - ', error.message);
    }

};

const loadAddCategory = async (req, res) => {

    try {

        res.render('addCategoryForm');

    } catch (error) {
        console.log('LoadaddCategory Method : -  ', error.message);
    }

};

const addCategory = async (req, res) => {

    try {

        const name = req.body.name;
        const isExisting = await Categories.findOne({
            name: { $regex: name, $options: 'i' }
        });

        if (isExisting) {
            res.render('addCategoryForm', { messageFailed: 'Existing Category' });
        } else {
            const result = await Categories.create({ name: name })

            res.redirect('/admin/categories')
        }

    } catch (error) {
        console.log('addCategory Method :-  ', error.message);
    }
};

const loadEditCategory = async (req, res) => {

    try {

        const id = req.params.id;
        const category = await Categories.findById(id);
        if (!category) return res.render('404');

        res.render('editCategory', { category: category, id: id })

    } catch (error) {
        console.log('loadEditCategory Method :-  ', error.message);
    }

};

const mongoose = require('mongoose');

const editCategory = async (req, res) => {
    try {
        // const id = new mongo.ObjectID(req.params.id)
        const name = req.body.name;


        await Categories.updateOne(

            { _id: req.params.id },
                { $set: {name:name } }

        )

        const categories = await Categories.find();
        res.render('category', { category: categories });
    } catch (error) {
        console.log('editCategory Method: ', error.message);
    }
};


const hideCategory = async (req, res) => {

    try {

        const id = req.query.id;
        const data = await Categories.findOne({ _id: id });
        if (!data) return res.render('404');

        if (data.is_hidden === false) {

            await Categories.findOneAndUpdate(
                { _id: id },
                { $set: { is_hidden: true } }
            )

        } else {

            await Categories.findOneAndUpdate(
                { _id: id },
                { $set: { is_hidden: false } }
            )

        }

        res.redirect('/admin/categories');

    } catch (error) {
        console.log('hideCategory Method :-  ', error.message);
    }

};

module.exports = {
    loadCategory,
    loadAddCategory,
    addCategory,
    loadEditCategory,
    editCategory,
    hideCategory,
}