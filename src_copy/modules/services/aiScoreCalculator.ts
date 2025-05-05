export const calculateFinalScores = ({
    gptScore,
    confidenceScore,
    voiceConfidenceScore,
    speechFluencyScore,
  }: {
    gptScore: number;
    confidenceScore: number; // yüz ifadesi confidence
    voiceConfidenceScore: number; // ses tonu confidence
    speechFluencyScore: number;
  }): {
    communicationScore: number;
    overallScore: number;
  } => {
    // İletişim skoru = yüz + ses + akıcılık
    const communicationScore = Math.round(
      (confidenceScore * 0.4 + voiceConfidenceScore * 0.4 + speechFluencyScore * 0.2)
    );
  
    // Genel skor = GPT %60 + iletişim %40
    const overallScore = Math.round(
      gptScore * 0.6 + communicationScore * 0.4
    );
  
    return {
      communicationScore,
      overallScore,
    };
  };
  