const express = require('express');
const { engine } = require('express-handlebars');
const session = require('express-session');
const path = require('path');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const { addUser, findUserByEmail } = require('./js/users');

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

// Register custom Handlebars helper
const handlebars = require('handlebars');
handlebars.registerHelper('ifCond', function (v1, v2, options) {
    if (v1 === v2) {
        return options.fn(this);
    }
    return options.inverse(this);
});

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
    if (req.session.user && req.session.user.loggedIn) {
        return next();
    } else {
        res.redirect('/login');
    }
};

// Sample data
let posts = [
    {
        id: uuidv4(),
        title: 'Exploring Hidden Gems in Europe',
        content: 'Just got back from an incredible trip through Europe. Visited some lesser-known spots that are truly breathtaking!',
        username: 'TravelGuru',
        timestamp: '2024-05-02 08:30',
        likes: 0
    },
    {
        id: uuidv4(),
        title: 'The Ultimate Guide to Homemade Pasta',
        content: 'Learned how to make pasta from scratch, and it’s easier than you think. Sharing my favorite recipes and tips.',
        username: 'FoodieFanatic',
        timestamp: '2024-05-02 09:45',
        likes: 0
    }
];

// Home page route
app.get('/', (req, res) => {
    res.render('home', {
        title: 'Home',
        user: req.session.user,
        posts: posts,
        showNavBar: true,
        layout: 'main'
    });
});

// Login page route
app.get('/login', (req, res) => {
    res.render('loginRegister', {
        title: 'Login',
        formType: 'Login',
        isLogin: true,
        showNavBar: false,
        layout: false
    });
});

// Register page route
app.get('/register', (req, res) => {
    res.render('loginRegister', {
        title: 'Register',
        formType: 'Register',
        isLogin: false,
        showNavBar: false,
        layout: false
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

// Create a new post
app.post('/posts', isAuthenticated, (req, res) => {
    const { title, content } = req.body;
    const newPost = {
        id: uuidv4(),
        title,
        content,
        username: req.session.user.firstName,
        timestamp: new Date().toISOString(),
        likes: 0
    };
    posts.push(newPost);
    res.redirect('/');
});

// Like a post
app.post('/like/:id', isAuthenticated, (req, res) => {
    const postId = req.params.id;
    const post = posts.find(p => p.id === postId);
    if (post && post.username !== req.session.user.firstName) {
        post.likes++;
    }
    res.redirect('/');
});

// Delete a post
app.post('/delete/:id', isAuthenticated, (req, res) => {
    const postId = req.params.id;
    posts = posts.filter(p => p.id !== postId || p.username !== req.session.user.firstName);
    res.redirect('/');
});

// Profile route
app.get('/profile', isAuthenticated, (req, res) => {
    const userPosts = posts.filter(post => post.username === req.session.user.firstName);
    res.render('profile', {
        title: 'Profile',
        user: req.session.user,
        showNavBar: true,
        layout: 'main',
        userPosts
    });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
