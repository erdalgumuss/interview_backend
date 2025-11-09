
export interface ApplicationTrendDTO {
  date: string;
  count: number;
}

export interface DepartmentApplicationDTO {
  department: string;
  count: number;
}

export interface CandidateProfileDTO {
  experience: string;
  count: number;
}

export interface FavoriteCandidateDTO {
  id: string;
  name: string;
  position: string;
  score: number;
}
// Opsiyonel: Mülakat özeti
export interface InterviewSummaryDTO {
    totalInterviews: number;
    publishedCount: number;
}

export interface DashboardDataDTO {
  applicationTrends: ApplicationTrendDTO[];
  departmentApplications: DepartmentApplicationDTO[];
  candidateProfiles: CandidateProfileDTO[];
  favoriteCandidates: FavoriteCandidateDTO[];
  interviewSummary: InterviewSummaryDTO;
}