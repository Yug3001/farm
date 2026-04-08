const mongoose = require('mongoose');

let isConnected = false; // track connection state for serverless environments

const connectDB = async () => {
    if (isConnected) {
        console.log('♻️  Reusing existing MongoDB connection');
        return;
    }

    try {
        const mongoUri = process.env.MONGODB_URI;

        if (!mongoUri) {
            throw new Error('MONGODB_URI is not defined in environment variables');
        }

        const conn = await mongoose.connect(mongoUri, {
            // These options help with Atlas cloud connections:
            serverSelectionTimeoutMS: 10000,  // Fail fast if Atlas is unreachable
            socketTimeoutMS: 45000,           // Close sockets after 45s of inactivity
            family: 4,                        // Use IPv4 (avoids some DNS issues)
            maxPoolSize: 10,                  // Max connection pool size
            minPoolSize: 2,                   // Keep at least 2 connections alive
            retryWrites: true,                // Atlas default — auto-retry failed writes
        });

        isConnected = true;
        console.log(`✅ MongoDB Atlas Connected: ${conn.connection.host}`);
        console.log(`📦 Database: ${conn.connection.name}`);

        // ── Connection Event Listeners ──────────────────────────────────────────
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

        // ── Graceful Shutdown ───────────────────────────────────────────────────
        process.on('SIGINT', async () => {
            await mongoose.connection.close();
            console.log('👋 MongoDB connection closed (SIGINT)');
            process.exit(0);
        });

        process.on('SIGTERM', async () => {
            await mongoose.connection.close();
            console.log('👋 MongoDB connection closed (SIGTERM)');
            process.exit(0);
        });

    } catch (error) {
        console.error(`❌ MongoDB connection failed: ${error.message}`);
        console.error(`   URI used: ${(process.env.MONGODB_URI || '').replace(/:([^@]+)@/, ':****@')}`);
        process.exit(1);
    }
};

module.exports = connectDB;
