/**
 * Migration Script: Interview sorularına _id ekle
 *
 * Mevcut mülakatların soruları _id: false ile oluşturulmuştu.
 * Bu script, tüm mevcut mülakatların sorularına unique ObjectId ekler.
 *
 * Kullanım: npx ts-node scripts/migrateQuestionIds.ts
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(__dirname, "../.env") });

const MONGO_URI = process.env.MONGO_URI || "";

async function migrateQuestionIds() {
  console.log("🔄 Migration başlıyor: Interview sorularına _id ekleniyor...");

  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ MongoDB bağlantısı başarılı");

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error("Database connection failed");
    }

    const interviewsCollection = db.collection("interviews");

    // Tüm mülakatları çek
    const interviews = await interviewsCollection.find({}).toArray();
    console.log(`📊 Toplam ${interviews.length} mülakat bulundu`);

    let updatedCount = 0;
    let questionsUpdated = 0;

    for (const interview of interviews) {
      if (!interview.questions || interview.questions.length === 0) {
        continue;
      }

      let needsUpdate = false;
      const updatedQuestions = interview.questions.map((q: any) => {
        if (!q._id) {
          needsUpdate = true;
          questionsUpdated++;
          return {
            ...q,
            _id: new mongoose.Types.ObjectId(),
          };
        }
        return q;
      });

      if (needsUpdate) {
        await interviewsCollection.updateOne(
          { _id: interview._id },
          { $set: { questions: updatedQuestions } }
        );
        updatedCount++;
        console.log(
          `  ✅ Mülakat güncellendi: ${interview.title} (${interview._id})`
        );
      }
    }

    console.log("\n📈 Migration Özeti:");
    console.log(`   - Güncellenen mülakat sayısı: ${updatedCount}`);
    console.log(`   - Güncellenen soru sayısı: ${questionsUpdated}`);
    console.log("✅ Migration başarıyla tamamlandı!");
  } catch (error) {
    console.error("❌ Migration hatası:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 MongoDB bağlantısı kapatıldı");
  }
}

migrateQuestionIds();
