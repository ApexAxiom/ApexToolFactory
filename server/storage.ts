import { 
  analyses, 
  resumes, 
  candidates,
  jobTemplates,
  analysisResults,
  savedSearches,
  analysisConversations,
  interviews,
  type Analysis, 
  type Resume, 
  type Candidate,
  type JobTemplate,
  type AnalysisResult,
  type SavedSearch,
  type AnalysisConversation,
  type Interview,
  type InsertAnalysis, 
  type InsertResume,
  type InsertCandidate,
  type InsertJobTemplate,
  type InsertAnalysisResult,
  type InsertSavedSearch,
  type InsertAnalysisConversation,
  type InsertInterview,
  type CandidateResult,
  type CandidateFilters,
  type CandidateSearchResult,
  type JobTemplateSearchResult,
  type BulkCandidateUpdate
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, like, ilike, gte, lte, inArray, desc, asc, sql } from "drizzle-orm";

export interface IStorage {
  // Analysis methods
  createAnalysis(analysis: InsertAnalysis): Promise<Analysis>;
  getAnalysis(id: number): Promise<Analysis | undefined>;
  updateAnalysisStatus(id: number, status: string, results?: CandidateResult[], averageScore?: number, totalResumes?: number): Promise<void>;
  getAnalysesList(page?: number, pageSize?: number): Promise<{ analyses: Analysis[]; total: number; }>;
  
  // Resume methods (legacy support)
  createResume(resume: InsertResume): Promise<Resume>;
  getResumesByAnalysisId(analysisId: number): Promise<Resume[]>;
  updateResume(id: number, updates: Partial<Resume>): Promise<void>;

  // Enhanced Candidate Database
  createCandidate(candidate: InsertCandidate): Promise<Candidate>;
  getCandidate(id: number): Promise<Candidate | undefined>;
  updateCandidate(id: number, updates: Partial<Candidate>): Promise<void>;
  deleteCandidate(id: number): Promise<void>;
  searchCandidates(filters: CandidateFilters, page?: number, pageSize?: number): Promise<CandidateSearchResult>;
  bulkUpdateCandidates(update: BulkCandidateUpdate): Promise<void>;
  getCandidatesByIds(ids: number[]): Promise<Candidate[]>;
  markCandidateAsFavorite(id: number, isFavorite: boolean): Promise<void>;
  updateCandidateStatus(id: number, status: string): Promise<void>;

  // Job Templates Library
  createJobTemplate(template: InsertJobTemplate): Promise<JobTemplate>;
  getJobTemplate(id: number): Promise<JobTemplate | undefined>;
  updateJobTemplate(id: number, updates: Partial<JobTemplate>): Promise<void>;
  deleteJobTemplate(id: number): Promise<void>;
  searchJobTemplates(search?: string, department?: string, page?: number, pageSize?: number): Promise<JobTemplateSearchResult>;
  getActiveJobTemplates(): Promise<JobTemplate[]>;

  // Analysis Results
  createAnalysisResult(result: InsertAnalysisResult): Promise<AnalysisResult>;
  getAnalysisResults(analysisId: number): Promise<AnalysisResult[]>;
  updateAnalysisResult(id: number, updates: Partial<AnalysisResult>): Promise<void>;

  // Saved Searches
  createSavedSearch(search: InsertSavedSearch): Promise<SavedSearch>;
  getSavedSearches(): Promise<SavedSearch[]>;
  deleteSavedSearch(id: number): Promise<void>;

  // Interview Scheduling
  createInterview(interview: InsertInterview): Promise<Interview>;
  getInterviews(candidateId?: number, status?: string): Promise<Interview[]>;
  updateInterview(id: number, updates: Partial<Interview>): Promise<void>;
  getUpcomingInterviews(): Promise<Interview[]>;

  // Analysis Conversations
  createAnalysisConversation(conversation: InsertAnalysisConversation): Promise<AnalysisConversation>;
  getAnalysisConversations(analysisId: number): Promise<AnalysisConversation[]>;
}

export class DatabaseStorage implements IStorage {
  // Analysis methods
  async createAnalysis(insertAnalysis: InsertAnalysis): Promise<Analysis> {
    const [analysis] = await db
      .insert(analyses)
      .values(insertAnalysis)
      .returning();
    return analysis;
  }

  async getAnalysis(id: number): Promise<Analysis | undefined> {
    const [analysis] = await db
      .select()
      .from(analyses)
      .where(eq(analyses.id, id));
    return analysis || undefined;
  }

  async updateAnalysisStatus(id: number, status: string, results?: CandidateResult[], averageScore?: number, totalResumes?: number): Promise<void> {
    console.log(`Updating analysis ${id} status to ${status}, results count: ${results?.length || 0}, averageScore: ${averageScore}`);
    
    const updateData: any = {
      status,
      updatedAt: new Date(),
    };
    
    if (results !== undefined) {
      updateData.results = results;
    }
    
    if (averageScore !== undefined) {
      updateData.averageScore = averageScore;
    }
    
    if (totalResumes !== undefined) {
      updateData.totalResumes = totalResumes;
    }
    
    await db
      .update(analyses)
      .set(updateData)
      .where(eq(analyses.id, id));
      
    console.log(`Analysis ${id} updated successfully`);
  }

  async getAnalysesList(page = 1, pageSize = 20): Promise<{ analyses: Analysis[]; total: number; }> {
    const offset = (page - 1) * pageSize;
    
    const [analysisResults, countResult] = await Promise.all([
      db
        .select()
        .from(analyses)
        .orderBy(desc(analyses.createdAt))
        .limit(pageSize)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)` })
        .from(analyses)
    ]);

    return {
      analyses: analysisResults,
      total: countResult[0]?.count || 0,
    };
  }

  // Resume methods (legacy support)
  async createResume(insertResume: InsertResume): Promise<Resume> {
    const [resume] = await db
      .insert(resumes)
      .values(insertResume)
      .returning();
    
    // Update analysis total count
    await db
      .update(analyses)
      .set({
        totalResumes: sql`${analyses.totalResumes} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(analyses.id, insertResume.analysisId));
    
    return resume;
  }

  async getResumesByAnalysisId(analysisId: number): Promise<Resume[]> {
    return await db
      .select()
      .from(resumes)
      .where(eq(resumes.analysisId, analysisId));
  }

  async updateResume(id: number, updates: Partial<Resume>): Promise<void> {
    await db
      .update(resumes)
      .set(updates)
      .where(eq(resumes.id, id));
  }

  // Enhanced Candidate Database
  async createCandidate(insertCandidate: InsertCandidate): Promise<Candidate> {
    // Set expiration date based on favorite status
    const expiresAt = new Date();
    if (insertCandidate.isFavorite) {
      expiresAt.setFullYear(expiresAt.getFullYear() + 3); // 3 years for favorites
    } else {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1); // 1 year for non-favorites
    }
    
    const [candidate] = await db
      .insert(candidates)
      .values({
        ...insertCandidate,
        expiresAt
      })
      .returning();
    return candidate;
  }

  async getCandidate(id: number): Promise<Candidate | undefined> {
    const [candidate] = await db
      .select()
      .from(candidates)
      .where(eq(candidates.id, id));
    return candidate || undefined;
  }

  async updateCandidate(id: number, updates: Partial<Candidate>): Promise<void> {
    await db
      .update(candidates)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(candidates.id, id));
  }

  async deleteCandidate(id: number): Promise<void> {
    await db
      .delete(candidates)
      .where(eq(candidates.id, id));
  }

  async searchCandidates(filters: CandidateFilters, page = 1, pageSize = 20): Promise<CandidateSearchResult> {
    const offset = (page - 1) * pageSize;
    let query = db.select().from(candidates);
    let countQuery = db.select({ count: sql<number>`count(*)` }).from(candidates);
    
    const conditions = [];

    if (filters.search) {
      const searchCondition = or(
        like(candidates.name, `%${filters.search}%`),
        like(candidates.email, `%${filters.search}%`),
        like(candidates.currentRole, `%${filters.search}%`),
        like(candidates.currentCompany, `%${filters.search}%`)
      );
      conditions.push(searchCondition);
    }

    if (filters.location) {
      conditions.push(ilike(candidates.location, `%${filters.location}%`));
    }

    if (filters.experience) {
      conditions.push(like(candidates.experience, `%${filters.experience}%`));
    }

    if (filters.status && filters.status.length > 0) {
      conditions.push(inArray(candidates.status, filters.status));
    }

    if (filters.isFavorite !== undefined) {
      conditions.push(eq(candidates.isFavorite, filters.isFavorite));
    }

    if (conditions.length > 0) {
      const whereCondition = and(...conditions);
      query = query.where(whereCondition);
      countQuery = countQuery.where(whereCondition);
    }

    const [candidateResults, countResult] = await Promise.all([
      query
        .orderBy(desc(candidates.updatedAt))
        .limit(pageSize)
        .offset(offset),
      countQuery
    ]);

    const total = countResult[0]?.count || 0;
    
    return {
      candidates: candidateResults,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async bulkUpdateCandidates(update: BulkCandidateUpdate): Promise<void> {
    await db
      .update(candidates)
      .set({ ...update.updates, updatedAt: new Date() })
      .where(inArray(candidates.id, update.candidateIds));
  }

  async getCandidatesByIds(ids: number[]): Promise<Candidate[]> {
    return await db
      .select()
      .from(candidates)
      .where(inArray(candidates.id, ids));
  }

  async markCandidateAsFavorite(id: number, isFavorite: boolean): Promise<void> {
    // Update expiration date when favorite status changes
    const expiresAt = new Date();
    if (isFavorite) {
      expiresAt.setFullYear(expiresAt.getFullYear() + 3); // 3 years for favorites
    } else {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1); // 1 year for non-favorites
    }
    
    await db
      .update(candidates)
      .set({ isFavorite, updatedAt: new Date(), expiresAt })
      .where(eq(candidates.id, id));
  }

  async updateCandidateStatus(id: number, status: string): Promise<void> {
    await db
      .update(candidates)
      .set({ status, updatedAt: new Date() })
      .where(eq(candidates.id, id));
  }

  // Job Templates Library
  async createJobTemplate(insertTemplate: InsertJobTemplate): Promise<JobTemplate> {
    const [template] = await db
      .insert(jobTemplates)
      .values(insertTemplate)
      .returning();
    return template;
  }

  async getJobTemplate(id: number): Promise<JobTemplate | undefined> {
    const [template] = await db
      .select()
      .from(jobTemplates)
      .where(eq(jobTemplates.id, id));
    return template || undefined;
  }

  async updateJobTemplate(id: number, updates: Partial<JobTemplate>): Promise<void> {
    await db
      .update(jobTemplates)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(jobTemplates.id, id));
  }

  async deleteJobTemplate(id: number): Promise<void> {
    await db
      .update(jobTemplates)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(jobTemplates.id, id));
  }

  async searchJobTemplates(search?: string, department?: string, page = 1, pageSize = 20): Promise<JobTemplateSearchResult> {
    const offset = (page - 1) * pageSize;
    let query = db.select().from(jobTemplates).where(eq(jobTemplates.isActive, true));
    let countQuery = db.select({ count: sql<number>`count(*)` }).from(jobTemplates).where(eq(jobTemplates.isActive, true));
    
    const conditions = [eq(jobTemplates.isActive, true)];

    if (search) {
      conditions.push(
        or(
          like(jobTemplates.title, `%${search}%`),
          like(jobTemplates.description, `%${search}%`)
        )
      );
    }

    if (department) {
      conditions.push(eq(jobTemplates.department, department));
    }

    if (conditions.length > 1) {
      const whereCondition = and(...conditions);
      query = query.where(whereCondition);
      countQuery = countQuery.where(whereCondition);
    }

    const [templateResults, countResult] = await Promise.all([
      query
        .orderBy(desc(jobTemplates.updatedAt))
        .limit(pageSize)
        .offset(offset),
      countQuery
    ]);

    const total = countResult[0]?.count || 0;
    
    return {
      templates: templateResults,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async getActiveJobTemplates(): Promise<JobTemplate[]> {
    return await db
      .select()
      .from(jobTemplates)
      .where(eq(jobTemplates.isActive, true))
      .orderBy(desc(jobTemplates.updatedAt));
  }

  // Analysis Results
  async createAnalysisResult(insertResult: InsertAnalysisResult): Promise<AnalysisResult> {
    const [result] = await db
      .insert(analysisResults)
      .values(insertResult)
      .returning();
    return result;
  }

  async getAnalysisResults(analysisId: number): Promise<AnalysisResult[]> {
    return await db
      .select()
      .from(analysisResults)
      .where(eq(analysisResults.analysisId, analysisId))
      .orderBy(asc(analysisResults.rank));
  }

  async updateAnalysisResult(id: number, updates: Partial<AnalysisResult>): Promise<void> {
    await db
      .update(analysisResults)
      .set(updates)
      .where(eq(analysisResults.id, id));
  }

  // Saved Searches
  async createSavedSearch(insertSearch: InsertSavedSearch): Promise<SavedSearch> {
    const [search] = await db
      .insert(savedSearches)
      .values(insertSearch)
      .returning();
    return search;
  }

  async getSavedSearches(): Promise<SavedSearch[]> {
    return await db
      .select()
      .from(savedSearches)
      .orderBy(desc(savedSearches.createdAt));
  }

  async deleteSavedSearch(id: number): Promise<void> {
    await db
      .delete(savedSearches)
      .where(eq(savedSearches.id, id));
  }

  // Interview Scheduling
  async createInterview(insertInterview: InsertInterview): Promise<Interview> {
    const [interview] = await db
      .insert(interviews)
      .values(insertInterview)
      .returning();
    return interview;
  }

  async getInterviews(candidateId?: number, status?: string): Promise<Interview[]> {
    let query = db.select().from(interviews);
    
    const conditions = [];
    if (candidateId) {
      conditions.push(eq(interviews.candidateId, candidateId));
    }
    if (status) {
      conditions.push(eq(interviews.status, status));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    return await query.orderBy(desc(interviews.scheduledAt));
  }

  async updateInterview(id: number, updates: Partial<Interview>): Promise<void> {
    await db
      .update(interviews)
      .set(updates)
      .where(eq(interviews.id, id));
  }

  async getUpcomingInterviews(): Promise<Interview[]> {
    return await db
      .select()
      .from(interviews)
      .where(
        and(
          eq(interviews.status, "scheduled"),
          gte(interviews.scheduledAt, new Date())
        )
      )
      .orderBy(asc(interviews.scheduledAt));
  }

  // Analysis Conversations
  async createAnalysisConversation(insertConversation: InsertAnalysisConversation): Promise<AnalysisConversation> {
    const [conversation] = await db
      .insert(analysisConversations)
      .values(insertConversation)
      .returning();
    return conversation;
  }

  async getAnalysisConversations(analysisId: number): Promise<AnalysisConversation[]> {
    return await db
      .select()
      .from(analysisConversations)
      .where(eq(analysisConversations.analysisId, analysisId))
      .orderBy(asc(analysisConversations.createdAt));
  }
}

export const storage = new DatabaseStorage();
