// scripts/checkApplication.ts
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import Application from '../src/modules/application/models/application.model';

dotenv.config({ path: path.join(__dirname, '../.env') });

const TARGET_ID = '693c2fb948a496fd4891ceae';

async function main() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/interview_db';
  await mongoose.connect(mongoUri);
  console.log('✅ MongoDB Connected\n');
  
  const app = await Application.findById(TARGET_ID);
  
  if (!app) {
    console.log(`❌ Application ${TARGET_ID} bulunamadı\n`);
  } else {
    console.log('📋 Application Detayı:\n');
    console.log(`ID: ${app._id}`);
    console.log(`InterviewId: ${app.interviewId}`);
    console.log(`Candidate: ${app.candidate?.name} ${app.candidate?.surname}`);
    console.log(`Email: ${app.candidate?.email}`);
    console.log(`Status: ${app.status}`);
    console.log(`DeletedAt: ${app.deletedAt}`);
    console.log(`\nRaw interviewId type: ${typeof app.interviewId}`);
    console.log(`InterviewId value: ${JSON.stringify(app.interviewId)}`);
  }
  
  await mongoose.connection.close();
}

main().catch(console.error);
