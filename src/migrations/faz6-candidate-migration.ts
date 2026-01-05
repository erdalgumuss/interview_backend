/**
 * FAZ 6.1 Migration Script
 * 
 * Bu script mevcut Application verilerini Candidate modeline migrate eder:
 * 1. Her application.candidate.email için Candidate kaydı oluşturur (yoksa)
 * 2. Application.candidateId'yi set eder
 * 3. Candidate.applicationIds ve interviewIds'i günceller
 * 
 * Kullanım:
 * npx ts-node src/migrations/faz6-candidate-migration.ts
 * 
 * ÖNEMLİ:
 * - Production'da çalıştırmadan önce backup alın
 * - Dry-run modu ile test edin (DRY_RUN=true)
 * - İşlem uzun sürebilir, batch processing kullanılıyor
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import ApplicationModel from '../modules/application/models/application.model';
import CandidateModel from '../modules/candidates/models/candidate.model';
import '../modules/interview/models/interview.model';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const connectDB = require('../config/db');

const DRY_RUN = process.env.DRY_RUN === 'true';
const BATCH_SIZE = 100;

interface MigrationStats {
    totalApplications: number;
    candidatesCreated: number;
    candidatesUpdated: number;
    applicationsUpdated: number;
    errors: string[];
}

async function migrate(): Promise<MigrationStats> {
    const stats: MigrationStats = {
        totalApplications: 0,
        candidatesCreated: 0,
        candidatesUpdated: 0,
        applicationsUpdated: 0,
        errors: []
    };

    console.log(`🚀 Starting FAZ 6.1 Migration (DRY_RUN: ${DRY_RUN})`);
    console.log('='.repeat(60));

    // candidateId'si olmayan tüm application'ları bul
    const totalCount = await ApplicationModel.countDocuments({ candidateId: { $exists: false } });
    stats.totalApplications = totalCount;

    console.log(`📊 Found ${totalCount} applications without candidateId`);

    if (totalCount === 0) {
        console.log('✅ No migration needed. All applications have candidateId.');
        return stats;
    }

    let processed = 0;
    let skip = 0;

    while (processed < totalCount) {
        // Batch olarak application'ları çek
        const applications = await ApplicationModel.find({ 
            candidateId: { $exists: false } 
        })
        .populate('interviewId', 'title')
        .skip(skip)
        .limit(BATCH_SIZE)
        .lean();

        if (applications.length === 0) break;

        for (const app of applications) {
            try {
                const email = app.candidate?.email?.toLowerCase().trim();
                
                if (!email) {
                    stats.errors.push(`Application ${app._id}: No email found`);
                    continue;
                }

                // Mevcut candidate'ı bul veya oluştur
                let candidate = await CandidateModel.findOne({
                    $or: [
                        { primaryEmail: email },
                        { 'emailAliases.email': email }
                    ]
                });

                const interviewId = app.interviewId;
                const interviewTitle = (interviewId as any)?.title || 'Unknown Interview';

                if (!candidate) {
                    // Yeni candidate oluştur
                    if (!DRY_RUN) {
                        candidate = await CandidateModel.create({
                            primaryEmail: email,
                            name: app.candidate.name,
                            surname: app.candidate.surname,
                            phone: app.candidate.phone,
                            status: 'active',
                            applicationIds: [app._id],
                            interviewIds: [interviewId],
                            firstInterviewDate: app.createdAt,
                            lastInterviewDate: app.createdAt,
                            lastInterviewTitle: interviewTitle,
                            scoreSummary: {
                                totalInterviews: 1,
                                completedInterviews: app.status === 'completed' ? 1 : 0,
                                avgOverallScore: app.generalAIAnalysis?.overallScore,
                                avgTechnicalScore: app.generalAIAnalysis?.technicalSkillsScore,
                                avgCommunicationScore: app.generalAIAnalysis?.communicationScore,
                                avgProblemSolvingScore: app.generalAIAnalysis?.problemSolvingScore,
                                avgPersonalityScore: app.generalAIAnalysis?.personalityMatchScore,
                                lastScore: app.generalAIAnalysis?.overallScore,
                                lastScoreDate: app.generalAIAnalysis?.overallScore ? app.updatedAt : undefined
                            }
                        });
                        stats.candidatesCreated++;
                    }
                    console.log(`  ✅ Created Candidate: ${email}`);
                } else {
                    // Mevcut candidate'ı güncelle
                    if (!DRY_RUN) {
                        const updateOps: any = {
                            $addToSet: {
                                applicationIds: app._id,
                                interviewIds: interviewId
                            }
                        };

                        // Tarihleri güncelle
                        if (!candidate.firstInterviewDate || app.createdAt < candidate.firstInterviewDate) {
                            updateOps.$min = { firstInterviewDate: app.createdAt };
                        }
                        if (!candidate.lastInterviewDate || app.createdAt > candidate.lastInterviewDate) {
                            updateOps.$set = { 
                                lastInterviewDate: app.createdAt,
                                lastInterviewTitle: interviewTitle
                            };
                        }

                        await CandidateModel.updateOne({ _id: candidate._id }, updateOps);
                        stats.candidatesUpdated++;
                    }
                    console.log(`  🔄 Updated Candidate: ${email}`);
                }

                // Application.candidateId'yi güncelle
                if (!DRY_RUN && candidate) {
                    await ApplicationModel.updateOne(
                        { _id: app._id },
                        { $set: { candidateId: candidate._id } }
                    );
                    stats.applicationsUpdated++;
                }
                console.log(`  📝 Linked Application ${app._id} -> Candidate ${candidate?._id || 'NEW'}`);

            } catch (error: any) {
                stats.errors.push(`Application ${app._id}: ${error.message}`);
                console.error(`  ❌ Error processing ${app._id}:`, error.message);
            }

            processed++;
        }

        skip += BATCH_SIZE;
        console.log(`\n📈 Progress: ${processed}/${totalCount} (${Math.round(processed/totalCount*100)}%)`);
    }

    return stats;
}

async function recalculateScoreSummaries(): Promise<void> {
    console.log('\n🔄 Recalculating score summaries for all candidates...');
    
    if (DRY_RUN) {
        console.log('  (Skipped in DRY_RUN mode)');
        return;
    }

    const candidates = await CandidateModel.find({ mergedInto: { $exists: false } });
    
    for (const candidate of candidates) {
        const applications = await ApplicationModel.find({
            _id: { $in: candidate.applicationIds },
            'generalAIAnalysis.overallScore': { $exists: true, $ne: null }
        }).sort({ createdAt: -1 }).lean();

        if (applications.length === 0) continue;

        const completedCount = applications.filter(a => a.status === 'completed').length;
        const scores = applications.map(a => a.generalAIAnalysis);

        const calculateAvg = (values: (number | undefined)[]): number | undefined => {
            const valid = values.filter((v): v is number => v !== undefined && v !== null);
            if (valid.length === 0) return undefined;
            return Math.round((valid.reduce((a, b) => a + b, 0) / valid.length) * 100) / 100;
        };

        await CandidateModel.updateOne(
            { _id: candidate._id },
            {
                $set: {
                    'scoreSummary.avgOverallScore': calculateAvg(scores.map(s => s?.overallScore)),
                    'scoreSummary.avgTechnicalScore': calculateAvg(scores.map(s => s?.technicalSkillsScore)),
                    'scoreSummary.avgCommunicationScore': calculateAvg(scores.map(s => s?.communicationScore)),
                    'scoreSummary.avgProblemSolvingScore': calculateAvg(scores.map(s => s?.problemSolvingScore)),
                    'scoreSummary.avgPersonalityScore': calculateAvg(scores.map(s => s?.personalityMatchScore)),
                    'scoreSummary.lastScore': applications[0]?.generalAIAnalysis?.overallScore,
                    'scoreSummary.lastScoreDate': applications[0]?.updatedAt,
                    'scoreSummary.totalInterviews': candidate.applicationIds.length,
                    'scoreSummary.completedInterviews': completedCount
                }
            }
        );
    }

    console.log(`✅ Recalculated score summaries for ${candidates.length} candidates`);
}

async function main(): Promise<void> {
    try {
        // Database bağlantısı
        await connectDB();
        console.log('✅ Connected to database\n');

        // Migration çalıştır
        const stats = await migrate();

        // Score summary'leri yeniden hesapla
        await recalculateScoreSummaries();

        // Sonuçları göster
        console.log('\n' + '='.repeat(60));
        console.log('📊 MIGRATION SUMMARY');
        console.log('='.repeat(60));
        console.log(`Total Applications Processed: ${stats.totalApplications}`);
        console.log(`Candidates Created: ${stats.candidatesCreated}`);
        console.log(`Candidates Updated: ${stats.candidatesUpdated}`);
        console.log(`Applications Updated: ${stats.applicationsUpdated}`);
        console.log(`Errors: ${stats.errors.length}`);
        
        if (stats.errors.length > 0) {
            console.log('\n❌ ERRORS:');
            stats.errors.forEach(err => console.log(`  - ${err}`));
        }

        if (DRY_RUN) {
            console.log('\n⚠️  DRY_RUN mode - No changes were made');
            console.log('Set DRY_RUN=false to apply changes');
        } else {
            console.log('\n✅ Migration completed successfully!');
        }

    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('\n👋 Disconnected from database');
    }
}

// Script'i çalıştır
main();
