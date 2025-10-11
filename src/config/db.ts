import mongoose from 'mongoose';

/**
 * MongoDB bağlantısını kurar ve yönetir.
 */
const connectDB = async () => {
    try {
        const mongoUri = process.env.MONGO_URI;

        if (!mongoUri) {
            console.error("FATAL ERROR: MONGO_URI is not defined in environment variables.");
            // Uygulamayı durdurmak için
            process.exit(1); 
        }

        const conn = await mongoose.connect(mongoUri);

        console.log(`🗃️ MongoDB Connected: ${conn.connection.host}`);
    } catch (err: any) {
        console.error(`MongoDB Connection Error: ${err.message}`);
        // Başarısız bağlantıda uygulamayı durdur
        process.exit(1);
    }
};

export default connectDB;