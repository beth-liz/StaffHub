import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const connUri = process.env.MONGO_URI || 'mongodb://localhost:27017/employee_management';
    console.log(`Connecting to MongoDB at: ${connUri}`);
    
    const conn = await mongoose.connect(connUri, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    console.log('Ensure MongoDB is running locally or check your MONGO_URI in the .env file.');
    // We do not crash the app immediately so the user gets a friendly warning/message if MongoDB isn't running
  }
};

export default connectDB;
