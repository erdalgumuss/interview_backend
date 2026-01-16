// scripts/seedTestData.ts
/**
 * Test Verileri Seed Script
 * 
 * Bu script:
 * 1. Belirtilen kullanıcının mevcut mülakatlarını ve başvurularını temizler
 * 2. Çeşitli senaryolar için yeni mülakatlar oluşturur
 * 3. Her mülakat için örnek başvurular oluşturur
 * 
 * Kullanım:
 * npx ts-node scripts/seedTestData.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import User from '../src/modules/auth/models/user.model';
import Interview from '../src/modules/interview/models/interview.model';
import Application from '../src/modules/application/models/application.model';
import { InterviewStatus } from '../src/modules/interview/models/interview.model';
import type { ApplicationStatus, ApplicationStep } from '../src/modules/application/models/application.model';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const TARGET_EMAIL = 'sefikarslan18@gmail.com';

// Örnek mülakat şablonları
const interviewTemplates = [
  {
    title: 'Frontend Developer Pozisyonu - React/TypeScript',
    description: 'Modern web uygulamaları geliştirmek için React ve TypeScript konusunda uzman frontend developer arıyoruz.',
    position: {
      title: 'Senior Frontend Developer',
      department: 'Engineering',
      description: 'React, TypeScript, Next.js ile modern web uygulamaları geliştirme',
      competencyWeights: {
        technical: 60,
        communication: 25,
        problem_solving: 15
      }
    },
    questions: [
      {
        questionText: 'React Hooks hakkında bilgi verebilir misiniz? Hangi hook\'ları sıklıkla kullanıyorsunuz?',
        expectedAnswer: 'useState, useEffect, useContext, useMemo, useCallback gibi hooklar ve bunların kullanım senaryoları',
        explanation: 'React Hooks bilgisi ve pratik kullanım deneyimi',
        keywords: ['useState', 'useEffect', 'useContext', 'hooks', 'react', 'lifecycle'],
        order: 1,
        duration: 180,
        aiMetadata: {
          complexityLevel: 'intermediate' as const,
          requiredSkills: ['React', 'JavaScript', 'Hooks'],
          keywordMatchScore: 0
        }
      },
      {
        questionText: 'TypeScript\'in avantajları nelerdir? Hangi TypeScript özelliklerini kullanıyorsunuz?',
        expectedAnswer: 'Type safety, interfaces, generics, type inference gibi özellikler',
        explanation: 'TypeScript bilgi seviyesi ve kullanım deneyimi',
        keywords: ['typescript', 'type safety', 'interface', 'generic', 'type', 'static typing'],
        order: 2,
        duration: 180,
        aiMetadata: {
          complexityLevel: 'intermediate' as const,
          requiredSkills: ['TypeScript', 'JavaScript'],
          keywordMatchScore: 0
        }
      },
      {
        questionText: 'Performans optimizasyonu için hangi yöntemleri kullanıyorsunuz?',
        expectedAnswer: 'Memoization, code splitting, lazy loading, virtualization gibi teknikler',
        explanation: 'Web performans optimizasyonu bilgisi',
        keywords: ['performance', 'optimization', 'memoization', 'lazy loading', 'code splitting'],
        order: 3,
        duration: 180,
        aiMetadata: {
          complexityLevel: 'advanced' as const,
          requiredSkills: ['Performance', 'React', 'Optimization'],
          keywordMatchScore: 0
        }
      }
    ],
    expirationDays: 30,
    status: InterviewStatus.ACTIVE
  },
  {
    title: 'Backend Developer Pozisyonu - Node.js/Express',
    description: 'Ölçeklenebilir backend sistemleri geliştirmek için deneyimli backend developer arıyoruz.',
    position: {
      title: 'Backend Developer',
      department: 'Engineering',
      description: 'Node.js, Express, MongoDB/PostgreSQL ile RESTful API geliştirme',
      competencyWeights: {
        technical: 70,
        communication: 15,
        problem_solving: 15
      }
    },
    questions: [
      {
        questionText: 'RESTful API tasarımında dikkat ettiğiniz prensipler nelerdir?',
        expectedAnswer: 'HTTP methods, status codes, versioning, pagination, error handling',
        explanation: 'API tasarım prensipleri bilgisi',
        keywords: ['REST', 'API', 'HTTP', 'status code', 'endpoint', 'design'],
        order: 1,
        duration: 180,
        aiMetadata: {
          complexityLevel: 'intermediate' as const,
          requiredSkills: ['API Design', 'REST', 'HTTP'],
          keywordMatchScore: 0
        }
      },
      {
        questionText: 'Database query optimizasyonu için hangi stratejileri kullanıyorsunuz?',
        expectedAnswer: 'Indexing, query planning, connection pooling, caching stratejileri',
        explanation: 'Veritabanı performans optimizasyonu bilgisi',
        keywords: ['database', 'optimization', 'indexing', 'query', 'performance', 'cache'],
        order: 2,
        duration: 180,
        aiMetadata: {
          complexityLevel: 'advanced' as const,
          requiredSkills: ['Database', 'SQL', 'Performance'],
          keywordMatchScore: 0
        }
      },
      {
        questionText: 'Mikroservis mimarisi deneyiminizden bahseder misiniz?',
        expectedAnswer: 'Service communication, API gateway, event-driven architecture',
        explanation: 'Mikroservis mimarisi bilgi ve deneyimi',
        keywords: ['microservices', 'architecture', 'distributed', 'API gateway', 'event-driven'],
        order: 3,
        duration: 180,
        aiMetadata: {
          complexityLevel: 'advanced' as const,
          requiredSkills: ['Microservices', 'Architecture', 'Distributed Systems'],
          keywordMatchScore: 0
        }
      }
    ],
    expirationDays: 45,
    status: InterviewStatus.ACTIVE
  },
  {
    title: 'Full Stack Developer - MERN Stack',
    description: 'Hem frontend hem backend geliştirme yapabilecek full stack developer pozisyonu.',
    position: {
      title: 'Full Stack Developer',
      department: 'Product Development',
      description: 'MongoDB, Express, React, Node.js stack ile tam kapsamlı web uygulamaları',
      competencyWeights: {
        technical: 50,
        communication: 30,
        problem_solving: 20
      }
    },
    questions: [
      {
        questionText: 'Full stack proje deneyiminizden bahseder misiniz?',
        expectedAnswer: 'End-to-end geliştirme, deployment, maintenance deneyimi',
        explanation: 'Full stack geliştirme deneyimi',
        keywords: ['full stack', 'project', 'frontend', 'backend', 'deployment'],
        order: 1,
        duration: 240,
        aiMetadata: {
          complexityLevel: 'intermediate' as const,
          requiredSkills: ['Full Stack', 'Project Management'],
          keywordMatchScore: 0
        }
      },
      {
        questionText: 'State management çözümlerinden hangilerini kullandınız?',
        expectedAnswer: 'Redux, Context API, Zustand, Recoil gibi state management araçları',
        explanation: 'State management bilgisi',
        keywords: ['state management', 'redux', 'context', 'zustand', 'recoil'],
        order: 2,
        duration: 180,
        aiMetadata: {
          complexityLevel: 'intermediate' as const,
          requiredSkills: ['React', 'State Management'],
          keywordMatchScore: 0
        }
      }
    ],
    expirationDays: 60,
    status: InterviewStatus.ACTIVE
  },
  {
    title: 'DevOps Engineer - CI/CD & Cloud',
    description: 'Cloud altyapısı ve CI/CD süreçlerini yönetecek DevOps engineer pozisyonu.',
    position: {
      title: 'DevOps Engineer',
      department: 'Infrastructure',
      description: 'AWS/Azure, Docker, Kubernetes, CI/CD pipeline yönetimi',
      competencyWeights: {
        technical: 75,
        communication: 15,
        problem_solving: 10
      }
    },
    questions: [
      {
        questionText: 'Docker ve Kubernetes deneyiminizden bahseder misiniz?',
        expectedAnswer: 'Container orchestration, scaling, deployment stratejileri',
        explanation: 'Container teknolojileri bilgisi',
        keywords: ['docker', 'kubernetes', 'container', 'orchestration', 'deployment'],
        order: 1,
        duration: 240,
        aiMetadata: {
          complexityLevel: 'advanced' as const,
          requiredSkills: ['Docker', 'Kubernetes', 'DevOps'],
          keywordMatchScore: 0
        }
      },
      {
        questionText: 'CI/CD pipeline nasıl tasarlarsınız?',
        expectedAnswer: 'Git workflow, automated testing, deployment strategies',
        explanation: 'CI/CD pipeline tasarımı',
        keywords: ['CI/CD', 'pipeline', 'automation', 'testing', 'deployment'],
        order: 2,
        duration: 180,
        aiMetadata: {
          complexityLevel: 'advanced' as const,
          requiredSkills: ['CI/CD', 'DevOps', 'Automation'],
          keywordMatchScore: 0
        }
      }
    ],
    expirationDays: 30,
    status: InterviewStatus.DRAFT
  }
];

// Örnek başvuru şablonları
const candidateTemplates = [
  {
    name: 'Ahmet',
    surname: 'Yılmaz',
    email: 'ahmet.yilmaz@example.com',
    phone: '+905301234567',
    phoneVerified: true,
    education: [
      {
        school: 'İstanbul Teknik Üniversitesi',
        degree: 'Bilgisayar Mühendisliği',
        graduationYear: 2020
      }
    ],
    experience: [
      {
        company: 'TechCorp',
        position: 'Frontend Developer',
        duration: '2 yıl',
        responsibilities: 'React ve TypeScript ile web uygulamaları geliştirme'
      }
    ],
    skills: {
      technical: ['React', 'TypeScript', 'JavaScript', 'HTML', 'CSS', 'Git'],
      personal: ['Takım çalışması', 'Problem çözme', 'İletişim'],
      languages: ['Türkçe (Ana dil)', 'İngilizce (İleri seviye)']
    },
    status: 'completed' as ApplicationStatus,
    hrRating: 4
  },
  {
    name: 'Ayşe',
    surname: 'Kaya',
    email: 'ayse.kaya@example.com',
    phone: '+905302345678',
    phoneVerified: true,
    education: [
      {
        school: 'Boğaziçi Üniversitesi',
        degree: 'Yazılım Mühendisliği',
        graduationYear: 2019
      },
      {
        school: 'Orta Doğu Teknik Üniversitesi',
        degree: 'Bilgisayar Mühendisliği (Yüksek Lisans)',
        graduationYear: 2021
      }
    ],
    experience: [
      {
        company: 'Global Tech',
        position: 'Senior Frontend Developer',
        duration: '3 yıl',
        responsibilities: 'React, Next.js, ve TypeScript ile enterprise uygulamalar'
      },
      {
        company: 'StartupXYZ',
        position: 'Full Stack Developer',
        duration: '1.5 yıl',
        responsibilities: 'MERN stack ile MVP geliştirme'
      }
    ],
    skills: {
      technical: ['React', 'Next.js', 'TypeScript', 'Node.js', 'MongoDB', 'AWS'],
      personal: ['Liderlik', 'Mentörlük', 'Agile/Scrum'],
      languages: ['Türkçe (Ana dil)', 'İngilizce (İleri seviye)', 'Almanca (Orta seviye)']
    },
    status: 'completed' as ApplicationStatus,
    hrRating: 5
  },
  {
    name: 'Mehmet',
    surname: 'Demir',
    email: 'mehmet.demir@example.com',
    phone: '+905303456789',
    phoneVerified: true,
    education: [
      {
        school: 'Hacettepe Üniversitesi',
        degree: 'Bilgisayar Bilimleri',
        graduationYear: 2021
      }
    ],
    experience: [
      {
        company: 'DataSoft',
        position: 'Backend Developer',
        duration: '1.5 yıl',
        responsibilities: 'Node.js ve PostgreSQL ile RESTful API geliştirme'
      }
    ],
    skills: {
      technical: ['Node.js', 'Express', 'PostgreSQL', 'MongoDB', 'REST API', 'Docker'],
      personal: ['Detay odaklı', 'Analitik düşünme', 'Öğrenme merakı'],
      languages: ['Türkçe (Ana dil)', 'İngilizce (Orta seviye)']
    },
    status: 'awaiting_ai_analysis' as ApplicationStatus,
    hrRating: 3
  },
  {
    name: 'Zeynep',
    surname: 'Arslan',
    email: 'zeynep.arslan@example.com',
    phone: '+905304567890',
    phoneVerified: true,
    education: [
      {
        school: 'Yıldız Teknik Üniversitesi',
        degree: 'Bilgisayar Mühendisliği',
        graduationYear: 2022
      }
    ],
    experience: [
      {
        company: 'WebAgency',
        position: 'Junior Full Stack Developer',
        duration: '8 ay',
        responsibilities: 'React ve Node.js ile e-ticaret projeleri'
      }
    ],
    skills: {
      technical: ['React', 'Node.js', 'MongoDB', 'Express', 'JavaScript', 'HTML/CSS'],
      personal: ['Hızlı öğrenme', 'Uyumlu', 'Proaktif'],
      languages: ['Türkçe (Ana dil)', 'İngilizce (İleri seviye)']
    },
    status: 'in_progress' as ApplicationStatus
  },
  {
    name: 'Can',
    surname: 'Öztürk',
    email: 'can.ozturk@example.com',
    phone: '+905305678901',
    phoneVerified: true,
    education: [
      {
        school: 'Ege Üniversitesi',
        degree: 'Bilgisayar Mühendisliği',
        graduationYear: 2018
      }
    ],
    experience: [
      {
        company: 'CloudInfra',
        position: 'DevOps Engineer',
        duration: '4 yıl',
        responsibilities: 'AWS altyapı yönetimi, Kubernetes, CI/CD pipeline kurulumu'
      },
      {
        company: 'TechStartup',
        position: 'System Administrator',
        duration: '2 yıl',
        responsibilities: 'Linux server yönetimi ve automation'
      }
    ],
    skills: {
      technical: ['AWS', 'Kubernetes', 'Docker', 'Terraform', 'Jenkins', 'Linux', 'Python'],
      personal: ['Problem çözme', 'Automation', 'Dokümantasyon'],
      languages: ['Türkçe (Ana dil)', 'İngilizce (İleri seviye)']
    },
    status: 'completed' as ApplicationStatus,
    hrRating: 4
  },
  {
    name: 'Elif',
    surname: 'Şahin',
    email: 'elif.sahin@example.com',
    phone: '+905306789012',
    phoneVerified: true,
    education: [
      {
        school: 'Bilkent Üniversitesi',
        degree: 'Bilgisayar Mühendisliği',
        graduationYear: 2023
      }
    ],
    experience: [],
    skills: {
      technical: ['JavaScript', 'React', 'HTML', 'CSS', 'Git', 'TypeScript'],
      personal: ['Öğrenmeye açık', 'Motivasyonlu', 'Takım oyuncusu'],
      languages: ['Türkçe (Ana dil)', 'İngilizce (Orta seviye)']
    },
    status: 'otp_verified' as ApplicationStatus
  }
];

// HR notları şablonları
const hrNoteTemplates = [
  {
    content: 'Teknik bilgisi oldukça iyi, özellikle React konusunda deneyimli.',
    isPrivate: false
  },
  {
    content: 'İletişim becerileri güçlü, ekip çalışmasına yatkın görünüyor.',
    isPrivate: false
  },
  {
    content: 'CV\'de belirtilen deneyim ile mülakat yanıtları tutarlı.',
    isPrivate: true
  },
  {
    content: 'Performans optimizasyonu konusunda pratik deneyimi sınırlı.',
    isPrivate: true
  },
  {
    content: 'Proaktif yaklaşım ve öğrenme isteği dikkat çekici.',
    isPrivate: false
  }
];

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

async function findUser() {
  const user = await User.findOne({ email: TARGET_EMAIL });
  if (!user) {
    console.error(`❌ Kullanıcı bulunamadı: ${TARGET_EMAIL}`);
    console.log('💡 Önce bu kullanıcıyı sisteme kayıt edin.');
    process.exit(1);
  }
  console.log(`✅ Kullanıcı bulundu: ${user.name} (${user.email})`);
  return user;
}

async function cleanupExistingData(userId: mongoose.Types.ObjectId) {
  console.log('\n🧹 Mevcut veriler temizleniyor...');
  
  // Kullanıcıya ait mülakatları bul
  const interviews = await Interview.find({ 
    'createdBy.userId': userId,
    deletedAt: null 
  });
  
  console.log(`📋 ${interviews.length} mülakat bulundu`);
  
  // Her mülakata ait başvuruları sil
  for (const interview of interviews) {
    const applicationCount = await Application.countDocuments({ 
      interviewId: interview._id,
      deletedAt: null 
    });
    
    if (applicationCount > 0) {
      await Application.updateMany(
        { interviewId: interview._id },
        { $set: { deletedAt: new Date() } }
      );
      console.log(`  ✓ ${applicationCount} başvuru soft delete yapıldı (Interview: ${interview.title})`);
    }
  }
  
  // Mülakatları soft delete yap
  if (interviews.length > 0) {
    await Interview.updateMany(
      { 'createdBy.userId': userId, deletedAt: null },
      { $set: { deletedAt: new Date() } }
    );
    console.log(`  ✓ ${interviews.length} mülakat soft delete yapıldı`);
  }
  
  console.log('✅ Temizlik tamamlandı\n');
}

async function createInterviews(userId: mongoose.Types.ObjectId, userName: string) {
  console.log('🎯 Yeni mülakatlar oluşturuluyor...\n');
  
  const createdInterviews = [];
  
  for (const template of interviewTemplates) {
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + template.expirationDays);
    
    const interview = new Interview({
      title: template.title,
      description: template.description,
      position: template.position,
      questions: template.questions,
      expirationDate,
      status: template.status,
      createdBy: {
        userId: userId
      },
      stages: {
        personalityTest: false,
        questionnaire: true
      },
      interviewLink: {
        link: `http://localhost:3000/interview/${Date.now()}${Math.random().toString(36).substring(7)}`,
        expirationDate
      },
      aiAnalysisSettings: {
        useAutomaticScoring: true,
        gestureAnalysis: true,
        speechAnalysis: true,
        eyeContactAnalysis: false,
        tonalAnalysis: false,
        keywordMatchScore: 0
      }
    });
    
    await interview.save();
    createdInterviews.push(interview);
    
    console.log(`  ✅ ${interview.title}`);
    console.log(`     📊 Status: ${interview.status}`);
    console.log(`     📅 Son başvuru: ${expirationDate.toLocaleDateString('tr-TR')}`);
    console.log(`     ❓ Soru sayısı: ${interview.questions.length}`);
    console.log();
  }
  
  console.log(`✅ ${createdInterviews.length} mülakat oluşturuldu\n`);
  return createdInterviews;
}

async function createApplications(interviews: any[], userId: mongoose.Types.ObjectId, userName: string) {
  console.log('📝 Başvurular oluşturuluyor...\n');
  
  let totalApplications = 0;
  
  // Her mülakat için farklı sayıda başvuru oluştur
  const applicationsPerInterview = [3, 4, 2, 1]; // Her mülakat için başvuru sayısı
  
  for (let i = 0; i < interviews.length; i++) {
    const interview = interviews[i];
    const applicationCount = applicationsPerInterview[i] || 2;
    
    console.log(`📋 ${interview.title}`);
    
    for (let j = 0; j < applicationCount; j++) {
      const candidateTemplate = candidateTemplates[totalApplications % candidateTemplates.length];
      
      // Her başvuru için unique email
      const uniqueEmail = `${candidateTemplate.email.split('@')[0]}_${totalApplications}@example.com`;
      
      const application = new Application({
        interviewId: interview._id,
        candidate: {
          name: candidateTemplate.name,
          surname: candidateTemplate.surname,
          email: uniqueEmail,
          phone: candidateTemplate.phone,
          phoneVerified: candidateTemplate.phoneVerified,
          verificationAttempts: 0
        },
        education: candidateTemplate.education,
        experience: candidateTemplate.experience,
        skills: candidateTemplate.skills,
        documents: {
          resume: undefined,
          certificates: [],
          socialMediaLinks: []
        },
        status: candidateTemplate.status,
        applicationProgress: {
          currentStep: 'completed' as ApplicationStep,
          completedSteps: ['otp_verification', 'personal_info', 'education', 'experience', 'skills', 'video_responses'],
          lastAccessedAt: new Date(),
          isResuming: false,
          stepCompletionDates: new Map()
        },
        responses: [],
        aiAnalysisResults: [],
        allowRetry: true,
        maxRetryAttempts: 3,
        retryCount: 0,
        hrNotes: [],
        favoritedBy: [],
        supportRequests: []
      });
      
      // HR rating varsa ekle
      if (candidateTemplate.hrRating) {
        application.hrRating = candidateTemplate.hrRating;
        application.reviewedBy = userId;
        application.reviewedAt = new Date();
      }
      
      // Bazı başvurulara HR notu ekle (rastgele)
      if (Math.random() > 0.5) {
        const noteCount = Math.floor(Math.random() * 3) + 1;
        for (let k = 0; k < noteCount; k++) {
          const noteTemplate = hrNoteTemplates[Math.floor(Math.random() * hrNoteTemplates.length)];
          application.hrNotes.push({
            authorId: userId,
            authorName: userName,
            content: noteTemplate.content,
            createdAt: new Date(),
            isPrivate: noteTemplate.isPrivate
          });
        }
      }
      
      // Bazı başvuruları favorilere ekle (rastgele)
      if (Math.random() > 0.6) {
        application.favoritedBy.push(userId);
      }
      
      await application.save();
      totalApplications++;
      
      const statusEmoji = candidateTemplate.status === 'completed' ? '✅' : 
                         candidateTemplate.status === 'in_progress' ? '⏳' : 
                         candidateTemplate.status === 'awaiting_ai_analysis' ? '🤖' : '📧';
      
      console.log(`     ${statusEmoji} ${application.candidate.name} ${application.candidate.surname} - ${application.status}`);
      if (application.hrRating) {
        console.log(`        ⭐ Rating: ${application.hrRating}/5`);
      }
      if (application.hrNotes.length > 0) {
        console.log(`        📝 ${application.hrNotes.length} not`);
      }
      if (application.favoritedBy.length > 0) {
        console.log(`        ❤️  Favorilerde`);
      }
    }
    console.log();
  }
  
  console.log(`✅ Toplam ${totalApplications} başvuru oluşturuldu\n`);
}

async function main() {
  console.log('🚀 Test Verileri Seed Script Başlatılıyor...\n');
  console.log('=' .repeat(60));
  console.log(`📧 Hedef Kullanıcı: ${TARGET_EMAIL}`);
  console.log('=' .repeat(60) + '\n');
  
  await connectDB();
  
  const user = await findUser();
  const userName = user.name;
  
  await cleanupExistingData(user._id);
  
  const interviews = await createInterviews(user._id, userName);
  
  await createApplications(interviews, user._id, userName);
  
  console.log('=' .repeat(60));
  console.log('✅ TÜM İŞLEMLER BAŞARIYLA TAMAMLANDI!');
  console.log('=' .repeat(60));
  console.log('\n📊 ÖZET:');
  console.log(`   • ${interviews.length} mülakat oluşturuldu`);
  console.log(`   • Her mülakat için başvurular eklendi`);
  console.log(`   • HR notları ve rating\'ler eklendi`);
  console.log(`   • Bazı başvurular favorilere eklendi`);
  console.log('\n🌐 Frontend\'i kontrol edebilirsiniz:');
  console.log('   • http://localhost:3000/interviews - Mülakatlar');
  console.log('   • http://localhost:3000/applications - Başvurular');
  console.log('   • http://localhost:3000/candidates - Adaylar');
  console.log();
  
  await mongoose.connection.close();
  console.log('👋 MongoDB bağlantısı kapatıldı\n');
}

main().catch((error) => {
  console.error('❌ Hata:', error);
  process.exit(1);
});
