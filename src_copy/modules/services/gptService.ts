import axios from 'axios';

export const analyzeWithGPT = async (
  questionText: string,
  expectedAnswer: string,
  transcript: string,
  keywords: string[],
  interviewTitle: string
) => {
  const prompt = `
  You are a professional AI interview evaluator.
  
  Analyze the candidate's answer based on the following:
  
  - Interview: "${interviewTitle}"
  - Question: "${questionText}"
  - Expected Answer: "${expectedAnswer}"
  - Important Keywords: [${keywords.map(k => `"${k}"`).join(", ")}]
  - Transcript: "${transcript}"
  
  Return your evaluation in pure JSON like this example:
  {
    "answerRelevanceScore": 85,
    "keywordMatches": ["kariyer", "güçlü yönler"],
    "strengths": ["Clear career background", "Mention of strong skills"],
    "improvementAreas": [
      { "area": "Detail", "recommendation": "Provide more specific examples." },
      { "area": "Language", "recommendation": "Be more concise." }
    ],
    "recommendation": "Good answer overall, but can be improved with more examples."
  }
  
  NO extra text. ONLY valid JSON.
  `;
  
  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        response_format: {type: 'json_object'},
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data.choices[0].message?.content 
      ? JSON.parse(response.data.choices[0].message.content)
      : null;
  } catch (err) {
    console.error('API çağrısı veya JSON ayrıştırma hatası:', err);
    throw new Error('GPT yanıtı ayrıştırılamadı veya API çağrısı başarısız oldu');
  }
};
