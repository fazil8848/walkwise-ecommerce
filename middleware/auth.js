const User = require('../models/userModels');


const isLogin = async (req, res, next) => {
	try {
		if (req.session.user_id) {
			const id = req.session.user_id;
			const data = await User.findById(id);
			if (data.is_blocked) {
				req.session.destroy();
				return res.render('login', { message: 'Your account is currently blocked' });
			}
		} else {
			return res.redirect('/login');
		}

		next();
	} catch (error) {
		console.log('Is login Method:', error.message);
	}
};


const isLogout = async (req, res, next) => {

	try {

		if (req.session.user_id) {

			id = req.session.user_id;
			const data = await User.findById(id);

			if (data.is_blocked === 1) {

				req.session.destroy();
				return res.render('login', { message: 'your account is currently blocked' });

			} else {
				return res.redirect('/home');
			}

		}

		next();

	} catch (error) {
		console.log('Is_Logout Method :-  ', error.message);
	}

}

// const Is_Blocked = async (req, res, next) => {

// 	try {

// 		const userData = await User.findOne({ email: req.body.email });
// 		if (userData.is_blocked === 1) {

// 			res.render('login', { message: 'your account is currently blocked' })

// 		} else {
// 			next();
// 		}

// 	} catch (error) {
// 		console.log('in Is_blocked middleware :-  ', error.message);
// 	}
// }



module.exports = {
	isLogin,
	isLogout,
	// Is_Blocked,
}