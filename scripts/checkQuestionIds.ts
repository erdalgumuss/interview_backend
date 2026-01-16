import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(__dirname, "../.env") });

async function checkQuestionIds() {
  await mongoose.connect(process.env.MONGO_URI || "");
  const db = mongoose.connection.db;

  if (!db) {
    console.log("DB connection failed");
    return;
  }

  const interview = await db.collection("interviews").findOne({
    _id: new mongoose.Types.ObjectId("696a43742403e7f883dcbeb9"),
  });

  console.log("Interview:", interview?.title);
  console.log("Questions:");
  interview?.questions?.forEach((q: any, i: number) => {
    console.log(
      `  ${i + 1}. _id: ${q._id} | text: ${q.questionText?.substring(0, 50)}...`
    );
  });

  await mongoose.disconnect();
}

checkQuestionIds().catch(console.error);
