const isLogin = (req, res, next) => {
    try {
        if (req.session.email) {
        } else {
            res.redirect('/admin');
        }
        return next();
    } catch (error) {
        console.log('The error is in the admin isLogin method:', error.message);
    }
};

const isLogout = (req, res, next) => {
    try {
        if (req.session.email) {
            res.redirect('/admin/home');
        } else {
        }
        next();
    } catch (error) {
        console.log('The error is in the admin isLogout method:', error.message);
    }
};

module.exports = {
    isLogin,
    isLogout
};
