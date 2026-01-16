// scripts/debugInterview.ts
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import Interview from '../src/modules/interview/models/interview.model';
import User from '../src/modules/auth/models/user.model';

dotenv.config({ path: path.join(__dirname, '../.env') });

const TARGET_INTERVIEW_ID = '69693694a08187dd64d51e69';
const TARGET_USER_EMAIL = 'sefikarslan18@gmail.com';

async function main() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/interview_db';
  await mongoose.connect(mongoUri);
  console.log('✅ MongoDB Connected\n');
  
  const user = await User.findOne({ email: TARGET_USER_EMAIL });
  if (!user) {
    console.log(`❌ User ${TARGET_USER_EMAIL} bulunamadı\n`);
    await mongoose.connection.close();
    return;
  }
  
  console.log('👤 Kullanıcı Bilgileri:\n');
  console.log(`ID: ${user._id}`);
  console.log(`ID toString: ${user._id.toString()}`);
  console.log(`Name: ${user.name}`);
  console.log(`Email: ${user.email}`);
  console.log(`Type of _id: ${typeof user._id}`);
  console.log();
  
  const interview = await Interview.findById(TARGET_INTERVIEW_ID);
  
  if (!interview) {
    console.log(`❌ Interview ${TARGET_INTERVIEW_ID} bulunamadı\n`);
  } else {
    console.log('📋 Interview Detayı:\n');
    console.log(`ID: ${interview._id}`);
    console.log(`Title: ${interview.title}`);
    console.log(`Status: ${interview.status}`);
    console.log(`CreatedBy.userId: ${interview.createdBy.userId}`);
    console.log(`CreatedBy.userId toString: ${interview.createdBy.userId.toString()}`);
    console.log(`Type of createdBy.userId: ${typeof interview.createdBy.userId}`);
    console.log();
    
    console.log('🔍 Karşılaştırma:\n');
    console.log(`user._id: ${user._id}`);
    console.log(`interview.createdBy.userId: ${interview.createdBy.userId}`);
    console.log();
    console.log(`user._id.toString(): "${user._id.toString()}"`);
    console.log(`interview.createdBy.userId.toString(): "${interview.createdBy.userId.toString()}"`);
    console.log();
    console.log(`Eşit mi (toString)? ${user._id.toString() === interview.createdBy.userId.toString()}`);
    console.log(`Eşit mi (ObjectId)? ${user._id.equals(interview.createdBy.userId)}`);
  }
  
  await mongoose.connection.close();
}

main().catch(console.error);
