// src/modules/candidates/services/candidate.service.ts

import mongoose from 'mongoose';
import CandidateModel, { ICandidate, CandidateStatus, ICandidateNote } from '../models/candidate.model';
import ApplicationModel from '../../application/models/application.model';
import InterviewModel from '../../interview/models/interview.model';
import {
    ICandidateFilters,
    ICandidateListResponse,
    ICandidateListItem,
    ICandidateDetailResponse,
    ICandidateInterviewItem,
    IScoreTrendResponse,
    IScoreTrendItem,
    IPotentialDuplicate,
    IMergeResponse,
    INoteResponse
} from '../types/candidate.types';

/**
 * Candidate Service
 * 
 * Aday havuzu yönetimi.
 * Mevcut interview, reports ve HR actions yapısını bozmaz.
 * Aggregate skorları yeniden hesaplamaz, mevcut analizlerden okur.
 * 
 * 📋 MODÜL SÖZLEŞMESİ:
 * - Identity (primaryEmail, emailAliases) - SADECE bu servis yönetir
 * - Canonical Profile (name, surname, phone) - SADECE bu servis yönetir, ilk create'te set edilir
 * - HR Domain (status, isFavorite, notes) - SADECE bu servis yönetir
 * - Aggregated Projections (scoreSummary) - SADECE bu servis yönetir
 * 
 * ❌ YAPMAZ:
 * - OTP / verification
 * - Interview state yönetimi
 * - Video / response kaydı
 * - AI analiz üretimi
 * - Application lifecycle yönetimi
 */
class CandidateService {

    // ================================
    // IDENTITY MANAGEMENT (FAZ 2.1)
    // ================================

    /**
     * ✅ YENİ METOD (FAZ 2.1): Email bazlı aday identity'si sağlar
     * Aday yoksa oluşturur, varsa döndürür.
     * Profile bilgilerini SADECE yeni oluşturma sırasında set eder.
     * 
     * @param email - Aday email adresi
     * @param profileData - İlk oluşturma için profile bilgileri (sadece create'te kullanılır)
     * @returns Candidate kaydı
     */
    async ensureCandidateIdentity(
        email: string,
        profileData?: {
            name: string;
            surname: string;
            phone?: string;
        }
    ): Promise<ICandidate> {
        const normalizedEmail = email.toLowerCase().trim();
        
        // Mevcut candidate'ı bul (primary email veya alias üzerinden)
        let candidate = await CandidateModel.findOne({
            $or: [
                { primaryEmail: normalizedEmail },
                { 'emailAliases.email': normalizedEmail }
            ],
            mergedInto: { $exists: false }
        });

        if (candidate) {
            // Mevcut candidate döndür - profile OVERWRITE ETME (FAZ 2.2 kuralı)
            return candidate;
        }

        // Yeni candidate oluştur
        if (!profileData) {
            throw new Error('Profile data is required for new candidate creation');
        }

        candidate = new CandidateModel({
            primaryEmail: normalizedEmail,
            name: profileData.name,
            surname: profileData.surname,
            phone: profileData.phone,
            status: 'active',
            applicationIds: [],
            interviewIds: [],
            scoreSummary: {
                totalInterviews: 0,
                completedInterviews: 0
            }
        });

        await candidate.save();
        return candidate;
    }

    /**
     * ✅ YENİ METOD (FAZ 2.1): Application'ı Candidate'a bağlar
     * Candidate'in applicationIds ve interviewIds array'lerini günceller.
     * Tarihleri ve cache alanlarını günceller.
     * 
     * @param candidateId - Candidate ObjectId
     * @param applicationId - Application ObjectId
     * @param interviewId - Interview ObjectId
     * @param interviewTitle - Interview başlığı (cache için)
     */
    async linkApplication(
        candidateId: mongoose.Types.ObjectId,
        applicationId: mongoose.Types.ObjectId,
        interviewId: mongoose.Types.ObjectId,
        interviewTitle?: string
    ): Promise<void> {
        const now = new Date();
        
        await CandidateModel.findByIdAndUpdate(
            candidateId,
            {
                $addToSet: {
                    applicationIds: applicationId,
                    interviewIds: interviewId
                },
                $set: {
                    lastInterviewDate: now,
                    ...(interviewTitle && { lastInterviewTitle: interviewTitle })
                },
                $min: { firstInterviewDate: now },
                $inc: { 'scoreSummary.totalInterviews': 1 }
            }
        );
    }

    // ================================
    // DEPRECATED SYNC (Geriye Uyumluluk)
    // ================================

    /**
     * @deprecated FAZ 2.1'de kaldırılacak. 
     * Yerine ensureCandidateIdentity() + linkApplication() kullanın.
     * 
     * Application oluşturulduğunda veya güncellendiğinde
     * Candidate kaydını oluştur veya güncelle
     */
    async syncFromApplication(applicationId: mongoose.Types.ObjectId): Promise<ICandidate | null> {
        console.warn('[DEPRECATED] syncFromApplication kullanılıyor. ensureCandidateIdentity + linkApplication kullanın.');
        
        const application = await ApplicationModel.findById(applicationId)
            .populate('interviewId', 'title position');
        
        if (!application) return null;

        const email = application.candidate.email.toLowerCase().trim();
        
        // Mevcut candidate'ı bul veya oluştur
        let candidate = await CandidateModel.findOne({
            $or: [
                { primaryEmail: email },
                { 'emailAliases.email': email }
            ]
        });

        if (!candidate) {
            // Yeni candidate oluştur
            candidate = new CandidateModel({
                primaryEmail: email,
                name: application.candidate.name,
                surname: application.candidate.surname,
                phone: application.candidate.phone,
                status: 'active',
                applicationIds: [applicationId],
                interviewIds: [application.interviewId],
                firstInterviewDate: application.createdAt,
                lastInterviewDate: application.createdAt,
                lastInterviewTitle: (application.interviewId as any)?.title
            });
        } else {
            // Mevcut candidate'ı güncelle
            if (!candidate.applicationIds.some(id => id.equals(applicationId))) {
                candidate.applicationIds.push(applicationId);
            }
            if (!candidate.interviewIds.some(id => id.equals(application.interviewId))) {
                candidate.interviewIds.push(application.interviewId);
            }
            
            // Tarihleri güncelle
            if (!candidate.firstInterviewDate || application.createdAt < candidate.firstInterviewDate) {
                candidate.firstInterviewDate = application.createdAt;
            }
            if (!candidate.lastInterviewDate || application.createdAt > candidate.lastInterviewDate) {
                candidate.lastInterviewDate = application.createdAt;
                candidate.lastInterviewTitle = (application.interviewId as any)?.title;
            }
        }

        // Skor özetini güncelle (mevcut analizlerden oku)
        await this.updateScoreSummary(candidate);

        await candidate.save();
        return candidate;
    }

    /**
     * Skor özetini mevcut application'lardan hesapla
     * Yeni analiz yapmaz, sadece mevcut verileri okur
     */
    private async updateScoreSummary(candidate: ICandidate): Promise<void> {
        const applications = await ApplicationModel.find({
            _id: { $in: candidate.applicationIds },
            'generalAIAnalysis.overallScore': { $exists: true, $ne: null }
        }).sort({ createdAt: -1 });

        if (applications.length === 0) {
            candidate.scoreSummary = {
                totalInterviews: candidate.applicationIds.length,
                completedInterviews: 0
            };
            return;
        }

        const scores = applications.map(app => app.generalAIAnalysis);
        const completedCount = applications.filter(app => app.status === 'completed').length;

        // Ortalamaları hesapla (mevcut verilerden)
        const avgOverall = this.calculateAverage(scores.map(s => s?.overallScore));
        const avgTechnical = this.calculateAverage(scores.map(s => s?.technicalSkillsScore));
        const avgCommunication = this.calculateAverage(scores.map(s => s?.communicationScore));
        const avgProblemSolving = this.calculateAverage(scores.map(s => s?.problemSolvingScore));
        const avgPersonality = this.calculateAverage(scores.map(s => s?.personalityMatchScore));

        // Son skoru al
        const lastApp = applications[0];
        
        candidate.scoreSummary = {
            avgOverallScore: avgOverall,
            avgTechnicalScore: avgTechnical,
            avgCommunicationScore: avgCommunication,
            avgProblemSolvingScore: avgProblemSolving,
            avgPersonalityScore: avgPersonality,
            lastScore: lastApp?.generalAIAnalysis?.overallScore,
            lastScoreDate: lastApp?.updatedAt,
            totalInterviews: candidate.applicationIds.length,
            completedInterviews: completedCount
        };
    }

    private calculateAverage(values: (number | undefined)[]): number | undefined {
        const validValues = values.filter((v): v is number => v !== undefined && v !== null);
        if (validValues.length === 0) return undefined;
        return Math.round((validValues.reduce((a, b) => a + b, 0) / validValues.length) * 100) / 100;
    }

    // ================================
    // POZİSYON LİSTESİ (Filtreleme için)
    // ================================

    /**
     * GET /api/candidates/positions
     * Filtreleme dropdown'u için mevcut pozisyon/mülakat listesi
     * 
     * ✅ FAZ 5.1: Aggregation pipeline ile N+1 optimizasyonu
     */
    async getPositions(): Promise<{ _id: string; title: string; department?: string; candidateCount: number }[]> {
        // Aggregation pipeline ile tek seferde interview başına candidate sayısı
        const results = await CandidateModel.aggregate([
            // Sadece merge edilmemiş candidate'ları al
            { $match: { mergedInto: { $exists: false } } },
            // interviewIds array'ini aç
            { $unwind: '$interviewIds' },
            // Her interview için candidate'ları grupla
            { 
                $group: { 
                    _id: '$interviewIds',
                    candidateCount: { $sum: 1 }
                }
            },
            // Interview detaylarını çek
            {
                $lookup: {
                    from: 'interviews',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'interview'
                }
            },
            // Interview array'ini düzleştir
            { $unwind: '$interview' },
            // Sonuç formatını ayarla
            {
                $project: {
                    _id: { $toString: '$_id' },
                    title: '$interview.title',
                    department: '$interview.position.department',
                    candidateCount: 1
                }
            },
            // Candidate sayısına göre sırala
            { $sort: { candidateCount: -1 } }
        ]);

        return results;
    }

    // ================================
    // 1. ADAY LİSTELEME
    // ================================

    /**
     * GET /api/candidates
     * Aday havuzu listeleme (filtrelenebilir, sıralanabilir, sayfalanabilir)
     */
    async listCandidates(filters: ICandidateFilters): Promise<ICandidateListResponse> {
        const query: any = {
            mergedInto: { $exists: false } // Merge edilmişleri gösterme
        };

        // Status filtresi
        if (filters.status && filters.status.length > 0) {
            query.status = { $in: filters.status };
        }

        // Favori filtresi
        if (filters.onlyFavorites) {
            query.isFavorite = true;
        }

        // Interview/Position filtresi
        if (filters.interviewIds && filters.interviewIds.length > 0) {
            query.interviewIds = { 
                $in: filters.interviewIds.map(id => new mongoose.Types.ObjectId(id)) 
            };
        }

        // Mülakat sayısı filtresi
        if (filters.minInterviewCount !== undefined) {
            query['scoreSummary.totalInterviews'] = { 
                ...query['scoreSummary.totalInterviews'],
                $gte: filters.minInterviewCount 
            };
        }
        if (filters.maxInterviewCount !== undefined) {
            query['scoreSummary.totalInterviews'] = { 
                ...query['scoreSummary.totalInterviews'],
                $lte: filters.maxInterviewCount 
            };
        }

        // Tarih filtreleri
        if (filters.lastInterviewAfter) {
            query.lastInterviewDate = { 
                ...query.lastInterviewDate,
                $gte: new Date(filters.lastInterviewAfter) 
            };
        }
        if (filters.lastInterviewBefore) {
            query.lastInterviewDate = { 
                ...query.lastInterviewDate,
                $lte: new Date(filters.lastInterviewBefore) 
            };
        }

        // Skor filtreleri
        if (filters.minOverallScore !== undefined) {
            query['scoreSummary.avgOverallScore'] = { 
                ...query['scoreSummary.avgOverallScore'],
                $gte: filters.minOverallScore 
            };
        }
        if (filters.maxOverallScore !== undefined) {
            query['scoreSummary.avgOverallScore'] = { 
                ...query['scoreSummary.avgOverallScore'],
                $lte: filters.maxOverallScore 
            };
        }
        if (filters.minTechnicalScore !== undefined) {
            query['scoreSummary.avgTechnicalScore'] = { $gte: filters.minTechnicalScore };
        }
        if (filters.minCommunicationScore !== undefined) {
            query['scoreSummary.avgCommunicationScore'] = { $gte: filters.minCommunicationScore };
        }

        // Arama
        if (filters.search) {
            query.$text = { $search: filters.search };
        }

        // Sıralama
        let sort: any = { lastInterviewDate: -1 };
        if (filters.sortBy) {
            const order = filters.sortOrder === 'asc' ? 1 : -1;
            switch (filters.sortBy) {
                case 'lastInterview':
                    sort = { lastInterviewDate: order };
                    break;
                case 'score':
                    sort = { 'scoreSummary.avgOverallScore': order };
                    break;
                case 'createdAt':
                    sort = { createdAt: order };
                    break;
                case 'name':
                    sort = { name: order, surname: order };
                    break;
            }
        }

        // Sayfalama
        const page = filters.page || 1;
        const pageSize = filters.limit || filters.pageSize || 20;
        const skip = (page - 1) * pageSize;

        // Query çalıştır
        const [candidates, totalCount] = await Promise.all([
            CandidateModel.find(query)
                .sort(sort)
                .skip(skip)
                .limit(pageSize)
                .lean(),
            CandidateModel.countDocuments(query)
        ]);

        // Son mülakat başlığını al
        // ✅ FAZ 5.1: N+1 problemi çözümü - lastInterviewTitle cache kullanımı
        const candidateItems: ICandidateListItem[] = candidates.map((c) => {
            // Cache'den oku, yoksa boş string
            const lastInterviewTitle = c.lastInterviewTitle;

            return {
                _id: c._id.toString(),
                name: c.name,
                surname: c.surname,
                fullName: `${c.name} ${c.surname}`,
                primaryEmail: c.primaryEmail,
                phone: c.phone,
                status: c.status,
                isFavorite: c.isFavorite,
                scoreSummary: {
                    avgOverallScore: c.scoreSummary?.avgOverallScore,
                    avgTechnicalScore: c.scoreSummary?.avgTechnicalScore,
                    totalInterviews: c.scoreSummary?.totalInterviews || 0,
                    completedInterviews: c.scoreSummary?.completedInterviews || 0
                },
                lastInterviewDate: c.lastInterviewDate,
                lastInterviewTitle
            };
        });

        return {
            candidates: candidateItems,
            pagination: {
                page,
                pageSize,
                totalCount,
                totalPages: Math.ceil(totalCount / pageSize),
                hasMore: page * pageSize < totalCount
            }
        };
    }

    // ================================
    // 2. ADAY DETAY
    // ================================

    /**
     * GET /api/candidates/:id
     * 
     * 📋 FAZ 4.1: Merged candidate'lar için null döner
     * Controller'da 410 Gone veya redirect yapılmalı
     */
    async getCandidateDetail(candidateId: string): Promise<ICandidateDetailResponse | null> {
        const candidate = await CandidateModel.findById(candidateId).lean();
        if (!candidate) return null;
        
        // FAZ 4.1: Merged candidate kontrolü
        if (candidate.mergedInto) {
            console.log(`[FAZ 4.1] Candidate ${candidateId} merged into ${candidate.mergedInto}`);
            return null; // Controller'da 410 veya redirect yapılacak
        }

        return {
            _id: candidate._id.toString(),
            name: candidate.name,
            surname: candidate.surname,
            fullName: `${candidate.name} ${candidate.surname}`,
            primaryEmail: candidate.primaryEmail,
            emailAliases: candidate.emailAliases?.map(a => a.email) || [],
            phone: candidate.phone,
            status: candidate.status,
            isFavorite: candidate.isFavorite,
            favoritedAt: candidate.favoritedAt,
            scoreSummary: candidate.scoreSummary || {
                totalInterviews: 0,
                completedInterviews: 0
            },
            lastInterviewDate: candidate.lastInterviewDate,
            firstInterviewDate: candidate.firstInterviewDate,
            notesCount: candidate.notes?.length || 0,
            createdAt: candidate.createdAt,
            updatedAt: candidate.updatedAt
        };
    }

    /**
     * ✅ YENİ METOD (FAZ 4.1): Merged candidate redirect bilgisi
     * Eğer candidate merge edilmişse, hedef candidate ID'sini döner
     */
    async getMergeRedirectInfo(candidateId: string): Promise<{
        isMerged: boolean;
        mergedInto?: string;
        mergedAt?: Date;
    }> {
        const candidate = await CandidateModel.findById(candidateId)
            .select('mergedInto mergedAt')
            .lean();

        if (!candidate) {
            return { isMerged: false };
        }

        if (candidate.mergedInto) {
            return {
                isMerged: true,
                mergedInto: candidate.mergedInto.toString(),
                mergedAt: candidate.mergedAt
            };
        }

        return { isMerged: false };
    }
    // ================================
    // 3. MÜLAKAT GEÇMİŞİ
    // ================================

    /**
     * GET /api/candidates/:id/interviews
     */
    async getCandidateInterviews(candidateId: string): Promise<ICandidateInterviewItem[]> {
        const candidate = await CandidateModel.findById(candidateId).lean();
        if (!candidate) return [];

        const applications = await ApplicationModel.find({
            _id: { $in: candidate.applicationIds }
        })
        .populate<{ interviewId: { _id: mongoose.Types.ObjectId; title: string; position?: { title: string; department?: string } } }>(
            'interviewId', 
            'title position'
        )
        .sort({ createdAt: -1 })
        .lean();

        return applications.map(app => ({
            applicationId: app._id.toString(),
            interviewId: (app.interviewId as any)?._id?.toString() || '',
            interviewTitle: (app.interviewId as any)?.title || 'Bilinmeyen Mülakat',
            positionName: (app.interviewId as any)?.position?.title,
            department: (app.interviewId as any)?.position?.department,
            status: app.status,
            appliedAt: app.createdAt,
            completedAt: app.status === 'completed' ? app.updatedAt : undefined,
            scores: app.generalAIAnalysis ? {
                overallScore: app.generalAIAnalysis.overallScore,
                technicalScore: app.generalAIAnalysis.technicalSkillsScore,
                communicationScore: app.generalAIAnalysis.communicationScore
            } : undefined
        }));
    }

    // ================================
    // 4. SKOR TRENDİ
    // ================================

    /**
     * GET /api/candidates/:id/score-trend
     */
    async getScoreTrend(candidateId: string): Promise<IScoreTrendResponse> {
        const candidate = await CandidateModel.findById(candidateId).lean();
        if (!candidate) {
            return {
                trend: [],
                summary: { trend: 'insufficient_data' }
            };
        }

        const applications = await ApplicationModel.find({
            _id: { $in: candidate.applicationIds },
            'generalAIAnalysis.overallScore': { $exists: true, $ne: null }
        })
        .populate<{ interviewId: { title: string } }>('interviewId', 'title')
        .sort({ createdAt: 1 })
        .lean();

        const trend: IScoreTrendItem[] = applications.map(app => ({
            date: app.createdAt,
            interviewId: app.interviewId?.toString() || '',
            interviewTitle: (app.interviewId as any)?.title || 'Bilinmeyen',
            overallScore: app.generalAIAnalysis?.overallScore,
            technicalScore: app.generalAIAnalysis?.technicalSkillsScore,
            communicationScore: app.generalAIAnalysis?.communicationScore
        }));

        // Summary hesapla
        const scores = trend.map(t => t.overallScore).filter((s): s is number => s !== undefined);
        let trendDirection: 'improving' | 'declining' | 'stable' | 'insufficient_data' = 'insufficient_data';
        let scoreChange: number | undefined;

        if (scores.length >= 2) {
            const firstScore = scores[0];
            const lastScore = scores[scores.length - 1];
            scoreChange = Math.round((lastScore - firstScore) * 100) / 100;
            
            if (scoreChange > 5) {
                trendDirection = 'improving';
            } else if (scoreChange < -5) {
                trendDirection = 'declining';
            } else {
                trendDirection = 'stable';
            }
        }

        return {
            trend,
            summary: {
                firstScore: scores[0],
                lastScore: scores[scores.length - 1],
                avgScore: scores.length > 0 
                    ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100 
                    : undefined,
                scoreChange,
                trend: trendDirection
            }
        };
    }

    // ================================
    // 5. FAVORİ İŞLEMLERİ
    // ================================

    /**
     * POST /api/candidates/:id/favorite
     */
    async addToFavorites(candidateId: string, userId: string): Promise<boolean> {
        const result = await CandidateModel.updateOne(
            { _id: candidateId, mergedInto: { $exists: false } },
            { 
                $set: { 
                    isFavorite: true,
                    favoritedBy: new mongoose.Types.ObjectId(userId),
                    favoritedAt: new Date()
                }
            }
        );
        return result.modifiedCount > 0;
    }

    /**
     * DELETE /api/candidates/:id/favorite
     */
    async removeFromFavorites(candidateId: string): Promise<boolean> {
        const result = await CandidateModel.updateOne(
            { _id: candidateId },
            { 
                $set: { isFavorite: false },
                $unset: { favoritedBy: 1, favoritedAt: 1 }
            }
        );
        return result.modifiedCount > 0;
    }

    // ================================
    // 6. NOT İŞLEMLERİ
    // ================================

    /**
     * GET /api/candidates/:id/notes
     */
    async getNotes(candidateId: string): Promise<INoteResponse[]> {
        const candidate = await CandidateModel.findById(candidateId)
            .select('notes')
            .lean();
        
        if (!candidate) return [];

        return (candidate.notes || []).map(note => ({
            _id: note._id?.toString() || '',
            authorId: note.authorId.toString(),
            authorName: note.authorName,
            content: note.content,
            createdAt: note.createdAt
        })).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    /**
     * POST /api/candidates/:id/notes
     */
    async addNote(
        candidateId: string, 
        userId: string, 
        userName: string, 
        content: string
    ): Promise<INoteResponse | null> {
        const note: ICandidateNote = {
            _id: new mongoose.Types.ObjectId(),
            authorId: new mongoose.Types.ObjectId(userId),
            authorName: userName,
            content: content.trim(),
            createdAt: new Date()
        };

        const result = await CandidateModel.updateOne(
            { _id: candidateId, mergedInto: { $exists: false } },
            { $push: { notes: note } }
        );

        if (result.modifiedCount === 0) return null;

        return {
            _id: note._id!.toString(),
            authorId: note.authorId.toString(),
            authorName: note.authorName,
            content: note.content,
            createdAt: note.createdAt
        };
    }

    // ================================
    // 7. STATUS GÜNCELLEMESİ (Soft)
    // ================================

    /**
     * PATCH /api/candidates/:id/status
     */
    async updateStatus(candidateId: string, status: CandidateStatus): Promise<boolean> {
        const result = await CandidateModel.updateOne(
            { _id: candidateId, mergedInto: { $exists: false } },
            { $set: { status } }
        );
        return result.modifiedCount > 0;
    }

    // ================================
    // 7.5 HR PROFILE GÜNCELLEMESİ (FAZ 2.2)
    // ================================

    /**
     * ✅ YENİ METOD (FAZ 2.2): HR tarafından profile güncellemesi
     * SADECE HR bu metodu kullanabilir.
     * Normal adaylar kendi profillerini güncelleyemez.
     * 
     * @param candidateId - Güncellenecek aday ID'si
     * @param profileData - Güncellenecek profile verileri
     * @param updatedBy - Güncelleyen HR kullanıcı ID'si (audit için)
     */
    async updateCandidateProfile(
        candidateId: string,
        profileData: {
            name?: string;
            surname?: string;
            phone?: string;
        },
        updatedBy: string
    ): Promise<boolean> {
        const updateFields: any = {};
        
        if (profileData.name !== undefined) {
            updateFields.name = profileData.name.trim();
        }
        if (profileData.surname !== undefined) {
            updateFields.surname = profileData.surname.trim();
        }
        if (profileData.phone !== undefined) {
            updateFields.phone = profileData.phone.trim();
        }

        if (Object.keys(updateFields).length === 0) {
            return false; // Güncellenecek alan yok
        }

        const result = await CandidateModel.updateOne(
            { _id: candidateId, mergedInto: { $exists: false } },
            { $set: updateFields }
        );

        if (result.modifiedCount > 0) {
            console.log(`[HR] Candidate ${candidateId} profile updated by ${updatedBy}:`, updateFields);
        }

        return result.modifiedCount > 0;
    }

    // ================================
    // 8. DUPLICATE DETECTION
    // ================================

    /**
     * GET /api/candidates/:id/potential-duplicates
     */
    async getPotentialDuplicates(candidateId: string): Promise<IPotentialDuplicate[]> {
        const candidate = await CandidateModel.findById(candidateId).lean();
        if (!candidate) return [];

        const duplicates: IPotentialDuplicate[] = [];

        // Email benzerliği (domain hariç prefix benzerliği)
        const emailPrefix = candidate.primaryEmail.split('@')[0];
        const emailDomain = candidate.primaryEmail.split('@')[1];

        // Benzer email'ler
        const similarEmailCandidates = await CandidateModel.find({
            _id: { $ne: candidateId },
            mergedInto: { $exists: false },
            primaryEmail: { 
                $regex: new RegExp(`^${emailPrefix.substring(0, 5)}`, 'i')
            }
        }).limit(5).lean();

        for (const c of similarEmailCandidates) {
            if (c._id.toString() !== candidateId) {
                duplicates.push({
                    candidateId: c._id.toString(),
                    name: c.name,
                    surname: c.surname,
                    email: c.primaryEmail,
                    phone: c.phone,
                    matchReason: 'email_similar',
                    matchScore: this.calculateEmailSimilarity(candidate.primaryEmail, c.primaryEmail)
                });
            }
        }

        // Telefon eşleşmesi
        if (candidate.phone) {
            const phoneMatch = await CandidateModel.find({
                _id: { $ne: candidateId },
                mergedInto: { $exists: false },
                phone: candidate.phone
            }).limit(5).lean();

            for (const c of phoneMatch) {
                if (!duplicates.some(d => d.candidateId === c._id.toString())) {
                    duplicates.push({
                        candidateId: c._id.toString(),
                        name: c.name,
                        surname: c.surname,
                        email: c.primaryEmail,
                        phone: c.phone,
                        matchReason: 'phone_match',
                        matchScore: 95
                    });
                }
            }
        }

        // İsim benzerliği
        const nameMatch = await CandidateModel.find({
            _id: { $ne: candidateId },
            mergedInto: { $exists: false },
            name: { $regex: new RegExp(`^${candidate.name}$`, 'i') },
            surname: { $regex: new RegExp(`^${candidate.surname}$`, 'i') }
        }).limit(5).lean();

        for (const c of nameMatch) {
            if (!duplicates.some(d => d.candidateId === c._id.toString())) {
                duplicates.push({
                    candidateId: c._id.toString(),
                    name: c.name,
                    surname: c.surname,
                    email: c.primaryEmail,
                    phone: c.phone,
                    matchReason: 'name_match',
                    matchScore: 70
                });
            }
        }

        // Skora göre sırala
        return duplicates.sort((a, b) => b.matchScore - a.matchScore);
    }

    private calculateEmailSimilarity(email1: string, email2: string): number {
        const prefix1 = email1.split('@')[0].toLowerCase();
        const prefix2 = email2.split('@')[0].toLowerCase();
        
        // Levenshtein distance tabanlı basit benzerlik
        const maxLen = Math.max(prefix1.length, prefix2.length);
        let matches = 0;
        for (let i = 0; i < Math.min(prefix1.length, prefix2.length); i++) {
            if (prefix1[i] === prefix2[i]) matches++;
        }
        
        return Math.round((matches / maxLen) * 100);
    }

    // ================================
    // 9. MERGE (FAZ 4.1 GÜNCELLEMESI)
    // ================================

    /**
     * POST /api/candidates/:id/merge
     * Source candidate'ı target'a merge eder
     * Interview'ler korunur, email alias olur, source archived edilir
     * 
     * 📋 FAZ 4.1 GÜNCELLEME:
     * - Source candidate'ın Application'larındaki candidateId -> targetCandidateId
     * - Merged candidate read-only + redirect/410 ready
     */
    async mergeCandidates(
        sourceCandidateId: string, 
        targetCandidateId: string
    ): Promise<IMergeResponse | null> {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const [source, target] = await Promise.all([
                CandidateModel.findById(sourceCandidateId).session(session),
                CandidateModel.findById(targetCandidateId).session(session)
            ]);

            if (!source || !target) {
                await session.abortTransaction();
                return null;
            }

            if (source.mergedInto || target.mergedInto) {
                await session.abortTransaction();
                return null;
            }

            // Source'un email'ini alias olarak ekle
            target.emailAliases.push({
                email: source.primaryEmail,
                mergedFrom: source._id,
                mergedAt: new Date()
            });

            // Source'un alias'larını da ekle
            for (const alias of source.emailAliases || []) {
                if (!target.emailAliases.some(a => a.email === alias.email)) {
                    target.emailAliases.push({
                        ...alias,
                        mergedFrom: source._id,
                        mergedAt: new Date()
                    });
                }
            }

            // Application ve Interview ID'lerini birleştir
            const mergedApplicationIds = [...target.applicationIds];
            const mergedInterviewIds = [...target.interviewIds];

            for (const appId of source.applicationIds) {
                if (!mergedApplicationIds.some(id => id.equals(appId))) {
                    mergedApplicationIds.push(appId);
                }
            }

            for (const intId of source.interviewIds) {
                if (!mergedInterviewIds.some(id => id.equals(intId))) {
                    mergedInterviewIds.push(intId);
                }
            }

            target.applicationIds = mergedApplicationIds;
            target.interviewIds = mergedInterviewIds;

            // Notları birleştir
            target.notes = [...target.notes, ...source.notes];

            // Tarihleri güncelle
            if (source.firstInterviewDate && 
                (!target.firstInterviewDate || source.firstInterviewDate < target.firstInterviewDate)) {
                target.firstInterviewDate = source.firstInterviewDate;
            }
            if (source.lastInterviewDate && 
                (!target.lastInterviewDate || source.lastInterviewDate > target.lastInterviewDate)) {
                target.lastInterviewDate = source.lastInterviewDate;
                target.lastInterviewTitle = source.lastInterviewTitle || target.lastInterviewTitle;
            }

            // Skor özetini güncelle
            await this.updateScoreSummary(target);

            // ✅ FAZ 4.1: Application.candidateId'leri targetCandidateId'ye güncelle
            await ApplicationModel.updateMany(
                { candidateId: source._id },
                { $set: { candidateId: target._id } },
                { session }
            );

            // Source'u archived olarak işaretle
            source.status = 'archived';
            source.mergedInto = target._id;
            source.mergedAt = new Date();

            await Promise.all([
                target.save({ session }),
                source.save({ session })
            ]);

            await session.commitTransaction();

            console.log(`✅ [FAZ 4.1] Merge completed: ${sourceCandidateId} -> ${targetCandidateId}`);

            return {
                success: true,
                mergedCandidate: {
                    _id: target._id.toString(),
                    name: target.name,
                    surname: target.surname,
                    primaryEmail: target.primaryEmail,
                    totalInterviews: target.applicationIds.length
                },
                archivedCandidateId: source._id.toString(),
                interviewsMerged: source.applicationIds.length
            };

        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    // ================================
    // UTILITY: Email ile Candidate bul
    // ================================

    async findByEmail(email: string): Promise<ICandidate | null> {
        const normalizedEmail = email.toLowerCase().trim();
        return CandidateModel.findOne({
            $or: [
                { primaryEmail: normalizedEmail },
                { 'emailAliases.email': normalizedEmail }
            ],
            mergedInto: { $exists: false }
        });
    }
}

export default new CandidateService();
