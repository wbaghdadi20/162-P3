const express = require('express');
const { engine } = require('express-handlebars');
const session = require('express-session');
const path = require('path');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const { addUser, findUserByEmail } = require('./public/js/users');
const Jimp = require('jimp');

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
handlebars.registerHelper('ifCond', function(v1, v2, options) {
    if (v1 === v2) {
        return options.fn(this);
    }
    return options.inverse(this);
});

handlebars.registerHelper('ifUserMatch', function(firstName, lastName, username, options) {
    const fullName = `${firstName} ${lastName}`;
    if (fullName === username) {
        return options.fn(this);
    }
    return options.inverse(this);
});

handlebars.registerHelper('includes', function(array, value, options) {
    if (array && array.includes(value)) {
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
        timestamp: '5/2/2024, 08:30:10 AM',
        likes: 0,
        likedBy: [] // Array to keep track of users who liked the post
    },
    {
        id: uuidv4(),
        title: 'The Ultimate Guide to Homemade Pasta',
        content: 'Learned how to make pasta from scratch, and it’s easier than you think. Sharing my favorite recipes and tips.',
        username: 'FoodieFanatic',
        timestamp: '5/2/2024, 09:11:11 AM',
        likes: 0,
        likedBy: [] // Array to keep track of users who liked the post
    }
];

// Home page route
app.get('/', (req, res) => {
    // Sort posts by timestamp in descending order
    const sortedPosts = posts.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    console.log(`User data: ${JSON.stringify(req.session.user)}`);

    res.render('home', {
        title: 'Home',
        user: req.session.user,
        posts: sortedPosts,
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
        const newUser = { firstName, lastName, email, password: hashedPassword, createdAt: new Date().toLocaleString() };
        console.log("New user created at: " + newUser.createdAt);
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
        req.session.user = {
            id: user.email, 
            loggedIn: true, 
            firstName: user.firstName, 
            lastName: user.lastName,
            createdAt: user.createdAt
        };
        console.log(`User logged in: ${JSON.stringify(req.session.user)}`);
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
        username: `${req.session.user.firstName} ${req.session.user.lastName}`,
        timestamp: new Date().toLocaleString(),
        likes: 0,
        likedBy: [] // Initialize likedBy array
    };
    posts.push(newPost);
    res.redirect('/');
});

// Like a post
app.post('/like/:id', isAuthenticated, (req, res) => {
    const postId = req.params.id;
    const post = posts.find(p => p.id === postId);

    if (post) {
        const userIndex = post.likedBy.indexOf(req.session.user.firstName);

        if (userIndex === -1) {
            // User has not liked the post yet
            post.likes++;
            post.likedBy.push(req.session.user.firstName);
        } else {
            // User has already liked the post, so unlike it
            post.likes--;
            post.likedBy.splice(userIndex, 1);
        }
    }

    res.redirect('/');
});

// Delete a post
app.post('/delete/:id', isAuthenticated, (req, res) => {
    const postId = req.params.id;
    const fullName = `${req.session.user.firstName} ${req.session.user.lastName}`;
    console.log(`Attempting to delete post with ID: ${postId} by user: ${fullName}`);
    posts = posts.filter(p => !(p.id === postId && p.username === fullName));
    res.redirect('/');
});


// Profile route
app.get('/profile', isAuthenticated, (req, res) => {
    const fullName = `${req.session.user.firstName} ${req.session.user.lastName}`;
    const userPosts = posts.filter(post => post.username === fullName);

    console.log(`User data for profile: ${JSON.stringify(req.session.user)}`);


    res.render('profile', {
        title: 'Profile',
        user: req.session.user,
        userPosts: userPosts,
        showNavBar: true,
        layout: 'main'
    });
});

// Avatar generation endpoint
app.get('/avatar/:username', async (req, res) => {
    const { username } = req.params;
    const firstLetter = username.charAt(0).toUpperCase();
    const colors = ['#FFB6C1', '#ADD8E6', '#90EE90', '#FFA07A', '#20B2AA', '#87CEFA', '#778899', '#B0C4DE'];
    const backgroundColor = colors[username.charCodeAt(0) % colors.length];

    const image = new Jimp(200, 200, backgroundColor, (err, image) => {
        if (err) throw err;
    });

    const font = await Jimp.loadFont(Jimp.FONT_SANS_128_WHITE);
    image.print(font, 0, 0, {
        text: firstLetter,
        alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
        alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE
    }, 200, 200);

    image.getBuffer(Jimp.MIME_PNG, (err, buffer) => {
        if (err) throw err;
        res.setHeader('Content-Type', 'image/png');
        res.send(buffer);
    });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
