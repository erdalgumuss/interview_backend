// scripts/checkInterview.ts
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import Interview from '../src/modules/interview/models/interview.model';

dotenv.config({ path: path.join(__dirname, '../.env') });

const TARGET_ID = '691891616d5997b90413f2c1';

async function main() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/interview_db';
  await mongoose.connect(mongoUri);
  console.log('✅ MongoDB Connected\n');
  
  const interview = await Interview.findById(TARGET_ID);
  
  if (!interview) {
    console.log(`❌ Interview ${TARGET_ID} bulunamadı\n`);
  } else {
    console.log('📋 Interview Detayı:\n');
    console.log(`ID: ${interview._id}`);
    console.log(`Title: ${interview.title}`);
    console.log(`Status: ${interview.status}`);
    console.log(`DeletedAt: ${interview.deletedAt}`);
    console.log(`CreatedBy: ${interview.createdBy.userId}`);
  }
  
  await mongoose.connection.close();
}

main().catch(console.error);
