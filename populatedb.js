const sqlite = require('sqlite');
const sqlite3 = require('sqlite3');

// Placeholder for the database file name
const dbFileName = 'microblog.db';

async function initializeDB() {
    const db = await sqlite.open({ filename: dbFileName, driver: sqlite3.Database });

    await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            hashedGoogleId TEXT NOT NULL UNIQUE,
            avatar_url TEXT,
            memberSince DATETIME NOT NULL,
            selectedUsername TEXT
        );

        CREATE TABLE IF NOT EXISTS posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            username TEXT NOT NULL,
            timestamp DATETIME NOT NULL,
            likes INTEGER NOT NULL,
            likedBy TEXT
        );
    `);

    // Sample data - Replace these arrays with your own data
    const users = [
        { username: 'user1@example.com', hashedGoogleId: 'hashedGoogleId1', avatar_url: '', memberSince: '2024-01-01 12:00:00', selectedUsername: 'UserOne' },
        { username: 'user2@example.com', hashedGoogleId: 'hashedGoogleId2', avatar_url: '', memberSince: '2024-01-02 12:00:00', selectedUsername: 'UserTwo' }
    ];

    const posts = [
        { title: 'First Post', content: 'This is the first post', username: 'UserOne', timestamp: '2024-01-01 12:30:00', likes: 0, likedBy: '' },
        { title: 'Second Post', content: 'This is the second post', username: 'UserTwo', timestamp: '2024-01-02 12:30:00', likes: 0, likedBy: '' }
    ];

    // Insert sample data into the database
    await Promise.all(users.map(user => {
        return db.run(
            'INSERT INTO users (username, hashedGoogleId, avatar_url, memberSince, selectedUsername) VALUES (?, ?, ?, ?, ?)',
            [user.username, user.hashedGoogleId, user.avatar_url, user.memberSince, user.selectedUsername]
        );
    }));

    await Promise.all(posts.map(post => {
        return db.run(
            'INSERT INTO posts (title, content, username, timestamp, likes, likedBy) VALUES (?, ?, ?, ?, ?, ?)',
            [post.title, post.content, post.username, post.timestamp, post.likes, post.likedBy]
        );
    }));

    console.log('Database populated with initial data.');
    await db.close();
}

initializeDB().catch(err => {
    console.error('Error initializing database:', err);
});
