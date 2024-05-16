const express = require('express');
const { engine } = require('express-handlebars');
const session = require('express-session');
const path = require('path');
const bcrypt = require('bcrypt');
const { addUser, findUserByEmail } = require('./js/users'); // Import the users module

// Initialize Express app
const app = express();

// Set up Handlebars as the view engine
app.engine('handlebars', engine());
app.set('view engine', 'handlebars');

// Set up static file serving
app.use(express.static(path.join(__dirname, 'public')));

// Middleware for parsing request bodies
app.use(express.urlencoded({ extended: false }));

// Set up session management
app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true
}));

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
    if (req.session.user && req.session.user.loggedIn) {
        return next();
    } else {
        res.redirect('/login');
    }
};

// Define routes
app.get('/', (req, res) => {
    res.render('home', {
        title: 'Home',
        user: req.session.user,
        showNavBar: true,
        layout: 'main'
    });
});

app.get('/login', (req, res) => {
    res.render('loginRegister', {
        title: 'Login',
        formType: 'Login',
        isLogin: true,
        user: req.session.user,
        showNavBar: false,
        layout: 'main'
    });
});

app.get('/register', (req, res) => {
    res.render('loginRegister', {
        title: 'Register',
        formType: 'Register',
        isLogin: false,
        user: req.session.user,
        showNavBar: false,
        layout: 'main'
    });
});

// Handle user registration
app.post('/register', async (req, res) => {
    const { firstName, lastName, email, password, confirmPassword } = req.body;

    // Basic validation
    if (!firstName || !lastName || !email || !password || !confirmPassword) {
        return res.status(400).send('All fields are required.');
    }
    if (password !== confirmPassword) {
        return res.status(400).send('Passwords do not match.');
    }

    try {
        // Check if user already exists
        const existingUser = findUserByEmail(email);
        if (existingUser) {
            return res.status(400).send('User already exists.');
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create a new user
        const newUser = { firstName, lastName, email, password: hashedPassword, createdAt: new Date() };
        addUser(newUser);

        // Redirect to login page
        res.redirect('/login');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error.');
    }
});

// Handle user login
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    // Basic validation
    if (!email || !password) {
        return res.status(400).render('loginRegister', { formType: 'Login', isLogin: true, error: 'All fields are required.', showNavBar: false });
    }

    try {
        // Check if user exists
        const user = findUserByEmail(email);
        if (!user) {
            return res.status(400).render('loginRegister', { formType: 'Login', isLogin: true, error: 'Invalid credentials.', showNavBar: false });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).render('loginRegister', { formType: 'Login', isLogin: true, error: 'Invalid credentials.', showNavBar: false });
        }

        // Set up session
        req.session.user = { id: user.email, loggedIn: true, firstName: user.firstName, lastName: user.lastName };
        res.redirect('/');
    } catch (err) {
        console.error(err);
        res.status(500).render('loginRegister', { formType: 'Login', isLogin: true, error: 'Server error.', showNavBar: false });
    }
});

// Handle user logout
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).send('Server error.');
        }
        res.redirect('/');
    });
});

// Example of a protected route
app.get('/profile', isAuthenticated, (req, res) => {
    // Retrieve user details from session
    const user = findUserByEmail(req.session.user.id);
    res.render('profile', { user, showNavBar: true, layout: 'main' });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
