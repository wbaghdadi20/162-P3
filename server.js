const express = require('express');
const { engine } = require('express-handlebars');
const session = require('express-session');
const path = require('path');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const { createCanvas } = require('canvas');
const sqlite = require('sqlite');
const sqlite3 = require('sqlite3');
require('dotenv').config();
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

// For passport.js
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Initialize the database
let db;
async function initializeDB() {
    db = await sqlite.open({ filename: 'microblog.db', driver: sqlite3.Database });
    console.log('Database initialized.');
}

initializeDB().catch(err => {
    console.error('Error initializing database:', err);
});

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

// Initialize passport
app.use(passport.initialize());
app.use(passport.session());

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;

passport.use(new GoogleStrategy({
    clientID: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    callbackURL: `http://localhost:${PORT}/auth/google/callback`
}, async (token, tokenSecret, profile, done) => {
    const hashedGoogleId = profile.id;
    let user = await db.get('SELECT * FROM users WHERE hashedGoogleId = ?', hashedGoogleId);

    if (!user) {
        // Create a new user with Google profile information
        const newUser = {
            username: profile.emails[0].value,
            hashedGoogleId: hashedGoogleId,
            avatar_url: profile.photos[0].value,
            memberSince: new Date().toISOString()
        };
        await db.run(
            'INSERT INTO users (username, hashedGoogleId, avatar_url, memberSince) VALUES (?, ?, ?, ?)',
            [newUser.username, newUser.hashedGoogleId, newUser.avatar_url, newUser.memberSince]
        );
        user = await db.get('SELECT * FROM users WHERE hashedGoogleId = ?', hashedGoogleId);
    }

    return done(null, user);
}));

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    const user = await db.get('SELECT * FROM users WHERE id = ?', id);
    done(null, user);
});

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    } else {
        res.redirect('/loginRegister');
    }
};

// Register custom Handlebars helper
const handlebars = require('handlebars');
handlebars.registerHelper('ifCond', function (v1, v2, options) {
    if (v1 === v2) {
        return options.fn(this);
    }
    return options.inverse(this);
});

handlebars.registerHelper('ifUserMatch', function (userUsername, postUsername, options) {
    if (userUsername === postUsername) {
        return options.fn(this);
    }
    return options.inverse(this);
});

handlebars.registerHelper('includes', function (array, value, options) {
    if (array && array.includes(value)) {
        return options.fn(this);
    }
    return options.inverse(this);
});

// Functions to manage users
const addUser = async (user) => {
    await db.run(
        'INSERT INTO users (username, hashedGoogleId, avatar_url, memberSince) VALUES (?, ?, ?, ?)',
        [user.username, user.hashedGoogleId, user.avatar_url, user.memberSince]
    );
};

const findUserByEmail = async (email) => {
    return await db.get('SELECT * FROM users WHERE username = ?', email);
};

// Emoji storage
let emojiPages = [];
let prevSearchQuery = '';

// Function to fetch emojis from the API
const fetchEmojisFromApi = async (searchQuery = '') => {
    const apiUrl = searchQuery
        ? `https://emoji-api.com/emojis?search=${searchQuery}&access_key=${process.env.EMOJI_API_KEY}`
        : `https://emoji-api.com/emojis?access_key=${process.env.EMOJI_API_KEY}`;
    try {
        const response = await fetch(apiUrl);
        const data = await response.json();

        // Initialize the emojiPages array
        emojiPages = [];
        for (let i = 0; i < data.length; i += 10) {
            emojiPages.push(data.slice(i, i + 10));
        }

        console.log('Emojis fetched and stored in memory.');
    } catch (error) {
        console.error('Error fetching emojis from API:', error);
    }
};

// Route to get emojis
app.get('/emojis', async (req, res) => {
    const searchQuery = req.query.search || '';

    if (emojiPages.length === 0 || searchQuery !== prevSearchQuery) {
        await fetchEmojisFromApi(searchQuery);
        prevSearchQuery = searchQuery; // Update the previous search query
    }

    const page = parseInt(req.query.page) || 0;
    const emojis = emojiPages[page] || [];
    res.json({ emojis, totalPages: emojiPages.length });
});

// Home page route
app.get('/', async (req, res) => {
    const posts = await db.all('SELECT * FROM posts ORDER BY timestamp DESC');
    console.log(`User data in session: ${JSON.stringify(req.session.passport?.user)}`);

    res.render('home', {
        title: 'Home',
        user: req.user,
        posts: posts,
        showNavBar: true,
        layout: 'main'
    });
});

// Login/Register page route
app.get('/loginRegister', (req, res) => {
    res.render('loginRegister', {
        title: 'Login/Register',
        showNavBar: false,
        layout: false
    });
});

// Google OAuth routes
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/loginRegister' }),
    (req, res) => {
        req.session.user = {
            id: req.user.id,
            username: req.user.username,
            createdAt: req.user.memberSince,
            loggedIn: true
        };
        res.redirect('/');
    });

// Handle user logout
app.get('/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) {
            return next(err);
        }
        res.redirect('/googleLogout');
    });
});

// Create a new post
app.post('/posts', isAuthenticated, async (req, res) => {
    const { title, content } = req.body;
    const newPost = {
        title,
        content,
        username: req.user.username,
        timestamp: new Date().toISOString(),
        likes: 0
    };
    await db.run(
        'INSERT INTO posts (title, content, username, timestamp, likes) VALUES (?, ?, ?, ?, ?)',
        [newPost.title, newPost.content, newPost.username, newPost.timestamp, newPost.likes]
    );
    res.redirect('/');
});

// Like a post
app.post('/like/:id', isAuthenticated, async (req, res) => {
    const postId = req.params.id;
    const post = await db.get('SELECT * FROM posts WHERE id = ?', postId);
    const username = req.user.username;

    if (post) {
        const likedBy = post.likedBy ? post.likedBy.split(',') : [];
        const userIndex = likedBy.indexOf(username);

        if (post.username === username) {
            return res.redirect('/');
        }

        if (userIndex === -1) {
            // User has not liked the post yet
            await db.run('UPDATE posts SET likes = likes + 1, likedBy = ? WHERE id = ?', [likedBy.concat(username).join(','), postId]);
        } else {
            // User has already liked the post, so unlike it
            likedBy.splice(userIndex, 1);
            await db.run('UPDATE posts SET likes = likes - 1, likedBy = ? WHERE id = ?', [likedBy.join(','), postId]);
        }
    }

    res.redirect('/');
});

// Delete a post
app.post('/delete/:id', isAuthenticated, async (req, res) => {
    const postId = req.params.id;
    const username = req.user.username;
    console.log(`Attempting to delete post with ID: ${postId} by user: ${username}`);
    await db.run('DELETE FROM posts WHERE id = ? AND username = ?', [postId, username]);
    res.redirect('/');
});

// Get a single post by ID
app.get('/post/:id', async (req, res) => {
    const postId = req.params.id;
    const post = await db.get('SELECT * FROM posts WHERE id = ?', postId);

    if (!post) {
        return res.redirect('/error');
    }

    res.render('post', {
        title: post.title,
        post,
        user: req.user,
        showNavBar: true,
        layout: 'main'
    });
});

// Error page route
app.get('/error', (req, res) => {
    res.render('error', {
        title: 'Error',
        showNavBar: true,
        layout: 'main'
    });
});

// Profile route
app.get('/profile', isAuthenticated, async (req, res) => {
    const username = req.user.username;
    const userPosts = await db.all('SELECT * FROM posts WHERE username = ?', username);

    console.log(`User data for profile: ${JSON.stringify(req.user)}`);

    res.render('profile', {
        title: 'Profile',
        user: req.user,
        userPosts: userPosts,
        showNavBar: true,
        layout: 'main'
    });
});

// Avatar generation endpoint
app.get('/avatar/:username', (req, res) => {
    const { username } = req.params;
    const firstLetter = username.charAt(0).toUpperCase();
    const colors = ['#FFB6C1', '#ADD8E6', '#90EE90', '#FFA07A', '#20B2AA', '#87CEFA', '#778899', '#B0C4DE'];
    const backgroundColor = colors[username.charCodeAt(0) % colors.length];

    const canvas = createCanvas(200, 200);
    const ctx = canvas.getContext('2d');

    // Set background color
    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, 200, 200);

    // Set text properties
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '128px Sans';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Draw text
    ctx.fillText(firstLetter, 100, 100);

    // Send the image as a response
    canvas.toBuffer((err, buffer) => {
        if (err) throw err;
        res.setHeader('Content-Type', 'image/png');
        res.send(buffer);
    });
});

// Temporary route for testing environment variables
app.get('/test-env', (req, res) => {
    res.send(`CLIENT_ID: ${process.env.CLIENT_ID}, CLIENT_SECRET: ${process.env.CLIENT_SECRET}`);
});

// Google OAuth routes
app.get('/auth/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: '/loginRegister' }),
    (req, res) => {
        req.session.user = {
            id: req.user.id,
            username: req.user.username,
            createdAt: req.user.memberSince,
            loggedIn: true
        };
        res.redirect('/');
    });

app.get('/googleLogout', (req, res) => {
    res.render('googleLogout');
});

app.get('/logoutCallback', (req, res) => {
    res.redirect('/');
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
