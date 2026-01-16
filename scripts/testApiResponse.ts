import axios from "axios";

async function testApiResponse() {
  try {
    const response = await axios.get(
      "http://localhost:5000/api/public/interviews/696a43742403e7f883dcbeb9"
    );
    const data = response.data.data;

    console.log("Interview:", data.title);
    console.log("Questions:");
    data.questions.forEach((q: any, i: number) => {
      console.log(`  ${i + 1}. _id: ${q._id} (${typeof q._id})`);
      console.log(`      text: ${q.questionText?.substring(0, 40)}...`);
    });
  } catch (error: any) {
    console.error("Error:", error.message);
  }
}

testApiResponse();
