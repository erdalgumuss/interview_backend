// scripts/fixInterviewOwnership.ts
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import Interview from '../src/modules/interview/models/interview.model';
import User from '../src/modules/auth/models/user.model';

dotenv.config({ path: path.join(__dirname, '../.env') });

const TARGET_EMAIL = 'sefikarslan18@gmail.com';

async function main() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/interview_db';
  await mongoose.connect(mongoUri);
  console.log('✅ MongoDB Connected\n');
  
  const user = await User.findOne({ email: TARGET_EMAIL });
  if (!user) {
    console.log(`❌ User ${TARGET_EMAIL} bulunamadı\n`);
    await mongoose.connection.close();
    return;
  }
  
  console.log('👤 Hedef Kullanıcı:\n');
  console.log(`ID: ${user._id}`);
  console.log(`Name: ${user.name}`);
  console.log(`Email: ${user.email}\n`);
  
  // Tüm aktif mülakatları getir
  const interviews = await Interview.find({ deletedAt: null });
  
  console.log(`📋 Toplam ${interviews.length} aktif mülakat bulundu\n`);
  
  let fixCount = 0;
  
  for (const interview of interviews) {
    const currentOwnerId = interview.createdBy.userId.toString();
    const targetUserId = user._id.toString();
    
    console.log(`Mülakat: ${interview.title}`);
    console.log(`  Mevcut Owner: ${currentOwnerId}`);
    console.log(`  Hedef Owner: ${targetUserId}`);
    
    if (currentOwnerId !== targetUserId) {
      console.log(`  ⚠️  Sahiplik yanlış - düzeltiliyor...`);
      
      interview.createdBy.userId = user._id;
      await interview.save();
      
      fixCount++;
      console.log(`  ✅ Düzeltildi\n`);
    } else {
      console.log(`  ✓ Sahiplik doğru\n`);
    }
  }
  
  console.log('=' .repeat(60));
  console.log(`✅ ${fixCount} mülakatın sahipliği güncellendi`);
  console.log('=' .repeat(60) + '\n');
  
  await mongoose.connection.close();
}

main().catch(console.error);
