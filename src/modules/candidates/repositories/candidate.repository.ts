import { Types, UpdateQuery, ClientSession } from 'mongoose';
import CandidateModel, { ICandidate } from '../models/candidate.model';

export class CandidateRepository {
  /**
   * E-posta adresi ile aday bul (Primary veya Alias üzerinden)
   */
  public async findByEmail(email: string): Promise<ICandidate | null> {
    return CandidateModel.findOne({
      $or: [
        { primaryEmail: email.toLowerCase() },
        { 'emailAliases.email': email.toLowerCase() }
      ]
    }).exec();
  }

  /**
   * ID ile detaylı aday getir
   */
  public async findById(id: string): Promise<ICandidate | null> {
    return CandidateModel.findById(id).exec();
  }

  /**
   * Upsert (Varsa Güncelle / Yoksa Oluştur) Mekanizması
   * Application modülünden gelen verileri Master profile işlemek için kritik.
   */
  public async upsertCandidate(
    email: string,
    updateData: Partial<ICandidate>,
    session?: ClientSession
  ): Promise<ICandidate> {
    return CandidateModel.findOneAndUpdate(
      { primaryEmail: email.toLowerCase() },
      { 
        $set: updateData,
        $setOnInsert: { status: 'active' } 
      },
      { 
        upsert: true, 
        new: true, 
        session,
        runValidators: true 
      }
    ).exec() as unknown as ICandidate;
  }

  /**
   * Yetenek Havuzu Listeleme (Filtreleme ve Pagination ile)
   */
  public async listCandidates(filters: any, options: { page: number; limit: number }) {
    const { page, limit } = options;
    const skip = (page - 1) * limit;

    // TODO: Filtreleme mantığı serviste query'ye dönüştürülecek
    const candidates = await CandidateModel.find(filters)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

    const total = await CandidateModel.countDocuments(filters);

    return { candidates, total };
  }

  /**
   * Adaya yeni bir mülakat/başvuru ID'si bağla
   */
  public async linkApplication(
    candidateId: Types.ObjectId,
    applicationId: Types.ObjectId,
    interviewId: Types.ObjectId,
    session?: ClientSession
  ): Promise<void> {
    await CandidateModel.findByIdAndUpdate(
      candidateId,
      {
        $addToSet: { 
          applicationIds: applicationId,
          interviewIds: interviewId 
        },
        $set: { lastInterviewDate: new Date() }
      },
      { session }
    ).exec();
  }

  /**
   * Skor Özeti Güncelleme (AI Analysis sonrası çağrılır)
   */
  public async updateScoreSummary(
    candidateId: string,
    scoreData: Partial<ICandidate['scoreSummary']>,
    session?: ClientSession
  ): Promise<void> {
    await CandidateModel.findByIdAndUpdate(
      candidateId,
      { $set: { scoreSummary: scoreData } },
      { session }
    ).exec();
  }

  /**
   * Adaya Not Ekle
   */
  public async addNote(
    candidateId: string,
    note: ICandidate['notes'][0],
    session?: ClientSession
  ): Promise<ICandidate | null> {
    return CandidateModel.findByIdAndUpdate(
      candidateId,
      { $push: { notes: note } },
      { new: true, session }
    ).exec();
  }
}

export default new CandidateRepository();