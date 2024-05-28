const sqlite = require('sqlite');
const sqlite3 = require('sqlite3');

const dbFileName = 'microblog.db';

async function migrateDB() {
    const db = await sqlite.open({ filename: dbFileName, driver: sqlite3.Database });

    await db.exec(`
        ALTER TABLE posts ADD COLUMN likedBy TEXT;
    `);

    console.log('Database migrated.');
    await db.close();
}

migrateDB().catch(err => {
    console.error('Error migrating database:', err);
});
