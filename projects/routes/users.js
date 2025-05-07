const express = require('express');
const router = express.Router();
const User = require('../models/User');


router.get('/register', (req, res) => {
  if (req.session.userId) {
    return res.redirect('/users/profile');
  }
  res.render('register', { error: null });
});


router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.render('register', { error: 'All fields are required' });
    }
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.render('register', { error: 'Username or email already exists' });
    }
    const user = new User({ username, email, password });
    await user.save();
    res.redirect('/users/login');
  } catch (error) {
    res.render('register', { error: 'Error registering user' });
  }
});

router.get('/login', (req, res) => {
  if (req.session.userId) {
    return res.redirect('/users/profile');
  }
  res.render('login', { error: null });
});


router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.render('login', { error: 'All fields are required' });
    }
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.render('login', { error: 'Invalid credentials' });
    }
    req.session.userId = user._id;
    res.redirect('/users/profile');
  } catch (error) {
    res.render('login', { error: 'Error logging in' });
  }
});


router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/users/login');
  });
});

router.get('/profile', authMiddleware, (req, res) => {
  res.render('profile', { user: req.user });
});


function authMiddleware(req, res, next) {
  if (!req.session.userId) {
    return res.redirect('/users/login');
  }
  User.findById(req.session.userId).select('-password').then(user => {
    if (!user) {
      return res.redirect('/users/login');
    }
    req.user = user;
    next();
  }).catch(() => res.redirect('/users/login'));
}

module.exports = router;
module.exports.authMiddleware = authMiddleware;