// scripts/fixBrokenApplications.ts
/**
 * Bozuk Application Kayıtlarını Düzelt
 * 
 * - interviewId null olan başvuruları sil
 * - Veritabanı tutarlılığını sağla
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import Application from '../src/modules/application/models/application.model';
import Interview from '../src/modules/interview/models/interview.model';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function connectDB() {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/interview_db';
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB bağlantısı başarılı');
  } catch (error) {
    console.error('❌ MongoDB bağlantı hatası:', error);
    process.exit(1);
  }
}

async function fixBrokenApplications() {
  console.log('\n🔍 Bozuk başvurular aranıyor...\n');
  
  // 1. interviewId null veya undefined olan başvuruları bul
  const nullInterviewApps = await Application.find({
    $or: [
      { interviewId: null },
      { interviewId: { $exists: false } }
    ],
    deletedAt: null
  });
  
  if (nullInterviewApps.length > 0) {
    console.log(`⚠️  ${nullInterviewApps.length} başvuru interviewId null:\n`);
    for (const app of nullInterviewApps) {
      console.log(`  • ${app._id} - ${app.candidate?.name} ${app.candidate?.surname}`);
    }
    
    const result1 = await Application.updateMany(
      {
        $or: [
          { interviewId: null },
          { interviewId: { $exists: false } }
        ],
        deletedAt: null
      },
      { $set: { deletedAt: new Date() } }
    );
    console.log(`  ✓ ${result1.modifiedCount} başvuru soft delete yapıldı\n`);
  }
  
  // 2. Silinmiş interview'lara ait başvuruları bul
  console.log('🔍 Silinmiş mülakatların başvuruları aranıyor...\n');
  
  const allApplications = await Application.find({ deletedAt: null }).select('_id interviewId candidate status');
  const deletedInterviewIds = new Set<string>();
  const orphanApps: any[] = [];
  
  for (const app of allApplications) {
    if (!app.interviewId) continue;
    
    const interviewId = app.interviewId.toString();
    
    // Cache'de var mı kontrol et
    if (deletedInterviewIds.has(interviewId)) {
      orphanApps.push(app);
      continue;
    }
    
    // Interview'u kontrol et
    const interview = await Interview.findById(interviewId);
    if (!interview || interview.deletedAt) {
      deletedInterviewIds.add(interviewId);
      orphanApps.push(app);
    }
  }
  
  if (orphanApps.length > 0) {
    console.log(`⚠️  ${orphanApps.length} başvuru silinmiş mülakata ait:\n`);
    for (const app of orphanApps) {
      console.log(`  • ${app._id}`);
      console.log(`    Aday: ${app.candidate?.name} ${app.candidate?.surname || ''}`);
      console.log(`    Status: ${app.status}`);
      console.log(`    InterviewId: ${app.interviewId}`);
    }
    
    console.log('\n🗑️  Bu başvurular silinecek (soft delete)...\n');
    
    const appIds = orphanApps.map(a => a._id);
    const result2 = await Application.updateMany(
      { _id: { $in: appIds } },
      { $set: { deletedAt: new Date() } }
    );
    
    console.log(`✅ ${result2.modifiedCount} başvuru soft delete yapıldı\n`);
  } else {
    console.log('✅ Silinmiş mülakata ait başvuru bulunamadı!\n');
  }
}

async function main() {
  console.log('🚀 Bozuk Başvuruları Düzelt Script Başlatılıyor...\n');
  console.log('=' .repeat(60) + '\n');
  
  await connectDB();
  await fixBrokenApplications();
  
  console.log('=' .repeat(60));
  console.log('✅ İŞLEM TAMAMLANDI!');
  console.log('=' .repeat(60) + '\n');
  
  await mongoose.connection.close();
  console.log('👋 MongoDB bağlantısı kapatıldı\n');
}

main().catch((error) => {
  console.error('❌ Hata:', error);
  process.exit(1);
});
