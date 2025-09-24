import { MongooseModuleOptions } from '@nestjs/mongoose';

export const mongoAsyncConfig = async (): Promise<MongooseModuleOptions> => {
  try {
    const uri = process.env.MONGO_URI;
    const dbName = process.env.MONGO_DB || 'ThoXin';

    if (!uri) {
      throw new Error('MONGO_URI is not defined in .env file');
    }
    console.log('Connect Success:', dbName);

    return {
      uri,
      dbName,
    };
  } catch (error) {
    console.error('❌ MongoDB config failed:', error.message);
    throw error;
  }
};
