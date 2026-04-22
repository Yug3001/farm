const mongoose = require('mongoose');

let isConnected = false;
let retryCount  = 0;
const MAX_RETRIES = 5;

const connectDB = async () => {
    if (isConnected) {
        console.log('♻️  Reusing existing MongoDB connection');
        return;
    }

    const mongoUri = process.env.MONGODB_URI;

    if (!mongoUri) {
        console.error('❌ MONGODB_URI is not defined — running WITHOUT database (some features will fail)');
        return; // Don't crash — let the server start without DB
    }

    const tryConnect = async () => {
        try {
            const conn = await mongoose.connect(mongoUri, {
                serverSelectionTimeoutMS: 12000,
                socketTimeoutMS: 45000,
                family: 4,
                maxPoolSize: 10,
                minPoolSize: 1,
                retryWrites: true,
            });

            isConnected = true;
            retryCount  = 0;
            console.log(`✅ MongoDB Atlas Connected: ${conn.connection.host}`);
            console.log(`📦 Database: ${conn.connection.name}`);

        } catch (error) {
            retryCount++;
            const masked = (mongoUri || '').replace(/:([^@]+)@/, ':****@');
            console.error(`❌ MongoDB connection failed (attempt ${retryCount}/${MAX_RETRIES}): ${error.message}`);
            console.error(`   URI: ${masked}`);

            if (retryCount < MAX_RETRIES) {
                const delay = Math.min(5000 * retryCount, 30000); // 5s, 10s, 15s… max 30s
                console.log(`⏳ Retrying MongoDB in ${delay / 1000}s…`);
                setTimeout(tryConnect, delay);
            } else {
                console.error('💥 Max MongoDB retries reached — server running WITHOUT database.');
                console.error('   Soil/Crop analysis and Advisor features will return errors until DB is available.');
                // Do NOT call process.exit — keep the HTTP server alive
            }
        }
    };

    await tryConnect();

    // ── Event listeners ───────────────────────────────────────────────────────
    mongoose.connection.on('error', (err) => {
        console.error(`❌ MongoDB connection error: ${err}`);
        isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
        console.warn('⚠️  MongoDB disconnected — will auto-reconnect');
        isConnected = false;
    });

    mongoose.connection.on('reconnected', () => {
        console.log('🔄 MongoDB reconnected successfully');
        isConnected = true;
    });

    // ── Graceful shutdown ─────────────────────────────────────────────────────
    process.on('SIGINT', async () => {
        try { await mongoose.connection.close(); } catch (_) {}
        console.log('👋 MongoDB connection closed (SIGINT)');
        process.exit(0);
    });

    process.on('SIGTERM', async () => {
        try { await mongoose.connection.close(); } catch (_) {}
        console.log('👋 MongoDB connection closed (SIGTERM)');
        process.exit(0);
    });
};

module.exports = connectDB;
