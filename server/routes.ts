import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertAnalysisSchema, 
  insertResumeSchema, 
  insertCandidateSchema,
  insertJobTemplateSchema,
  insertSavedSearchSchema,
  insertAnalysisConversationSchema,
  insertInterviewSchema,
  type CandidateResult,
  type CandidateFilters,
  type BulkCandidateUpdate
} from "@shared/schema";
import { analyzeResumes } from "./services/aiAnalysis";
import { 
  extractTextFromFile, 
  validateFileType, 
  extractCandidateName,
  extractEmail,
  extractPhone,
  extractLocation,
  extractSkills,
  extractExperience,
  generateCandidateFingerprint,
  calculateNameSimilarity
} from "./services/fileProcessor";
import { enhanceProfileWithAI } from "./services/profileBuilder";
import { generateChatResponse } from "./services/analysisChat";
import multer from "multer";
import * as fs from "fs";
import * as path from "path";

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit per file
    files: 50 // Max 50 files for enterprise recruiting
  },
  fileFilter: (req, file, cb) => {
    if (validateFileType(file.originalname)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOCX, and TXT files are allowed.'));
    }
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Create new analysis
  app.post("/api/analyses", async (req, res) => {
    try {
      const validatedData = insertAnalysisSchema.parse(req.body);
      const analysis = await storage.createAnalysis(validatedData);
      res.json(analysis);
    } catch (error) {
      console.error("Error creating analysis:", error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "Failed to create analysis" 
      });
    }
  });

  // Get analysis by ID
  app.get("/api/analyses/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid analysis ID" });
      }

      const analysis = await storage.getAnalysis(id);
      if (!analysis) {
        return res.status(404).json({ message: "Analysis not found" });
      }

      // Use stored results from analysis if available (new enterprise system)
      let results: CandidateResult[] = [];
      
      if (analysis.results && Array.isArray(analysis.results) && analysis.results.length > 0) {
        // Use enterprise analysis results stored directly in analysis
        results = analysis.results as CandidateResult[];
      } else {
        // Fallback to legacy resume-based system
        const resumes = await storage.getResumesByAnalysisId(id);
        results = resumes.map(resume => ({
          id: resume.id,
          filename: resume.filename,
          name: extractCandidateName(resume.originalText, resume.filename),
          score: resume.score || 0,
          rank: resume.rank || 0,
          analysis: resume.analysis || "",
          tags: (resume.tags as string[]) || [],
          isUnderdog: Boolean(resume.isUnderdog),
          underdogReason: resume.underdogReason || undefined,
        }));
      }

      // Ensure we have valid data before sending response
      const responseData = {
        id: analysis.id,
        status: analysis.status,
        totalResumes: analysis.totalResumes || results.length,
        averageScore: analysis.averageScore || 0,
        results: results.sort((a, b) => a.rank - b.rank),
      };
      
      // Log for debugging
      console.log(`Sending analysis ${id} response:`, {
        id: responseData.id,
        status: responseData.status,
        totalResumes: responseData.totalResumes,
        resultsCount: responseData.results.length,
        averageScore: responseData.averageScore
      });
      
      res.json(responseData);
    } catch (error) {
      console.error("Error fetching analysis:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to fetch analysis" 
      });
    }
  });

  // Upload resumes for analysis (legacy route)
  app.post("/api/analyses/:id/resumes", upload.array('resumes', 50), async (req, res) => {
    try {
      const analysisId = parseInt(req.params.id);
      if (isNaN(analysisId)) {
        return res.status(400).json({ message: "Invalid analysis ID" });
      }

      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ message: "No files uploaded" });
      }

      const analysis = await storage.getAnalysis(analysisId);
      if (!analysis) {
        return res.status(404).json({ message: "Analysis not found" });
      }

      // Process each uploaded file
      const processedResumes = [];
      for (const file of files) {
        try {
          const text = await extractTextFromFile(file.path, file.originalname);
          const resume = await storage.createResume({
            analysisId,
            filename: file.originalname,
            originalText: text,
          });
          processedResumes.push(resume);
          
          // Clean up uploaded file
          fs.unlinkSync(file.path);
        } catch (error) {
          console.error(`Error processing file ${file.originalname}:`, error);
          // Clean up file even if processing failed
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        }
      }

      res.json({ 
        message: `Successfully uploaded ${processedResumes.length} resumes`,
        resumes: processedResumes.length 
      });
    } catch (error) {
      console.error("Error uploading resumes:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to upload resumes" 
      });
    }
  });

  // Start analysis
  app.post("/api/analyses/:id/analyze", async (req, res) => {
    try {
      const analysisId = parseInt(req.params.id);
      if (isNaN(analysisId)) {
        return res.status(400).json({ message: "Invalid analysis ID" });
      }

      const analysis = await storage.getAnalysis(analysisId);
      if (!analysis) {
        return res.status(404).json({ message: "Analysis not found" });
      }

      if (analysis.status !== "pending") {
        return res.status(400).json({ message: "Analysis already processed or in progress" });
      }

      const resumes = await storage.getResumesByAnalysisId(analysisId);
      if (resumes.length === 0) {
        return res.status(400).json({ message: "No resumes uploaded for analysis" });
      }

      // Update status to processing
      await storage.updateAnalysisStatus(analysisId, "processing");

      // Start analysis in background
      analyzeResumesInBackground(analysisId, analysis.jobDescription, resumes);

      res.json({ message: "Analysis started", status: "processing" });
    } catch (error) {
      console.error("Error starting analysis:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to start analysis" 
      });
    }
  });

  // ===== ENTERPRISE CANDIDATE MANAGEMENT =====
  
  // Upload bulk resumes to candidate database with duplicate detection
  app.post("/api/candidates/upload", upload.array('resumes', 50), async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ message: "No files uploaded" });
      }

      const processedCandidates = [];
      const duplicates = [];
      const errors = [];

      // Get existing candidates for duplicate detection
      const existingCandidates = await storage.searchCandidates({}, 1, 10000);

      for (const file of files) {
        try {
          const text = await extractTextFromFile(file.path, file.originalname);
          const name = extractCandidateName(text, file.originalname);
          const email = extractEmail(text);
          const phone = extractPhone(text);
          const location = extractLocation(text);
          const skills = extractSkills(text);
          const experience = extractExperience(text);
          
          // Check for duplicates
          let isDuplicate = false;
          let duplicateCandidate = null;

          for (const existing of existingCandidates.candidates) {
            // Check email match first (strongest indicator)
            if (email && existing.email && email.toLowerCase() === existing.email.toLowerCase()) {
              isDuplicate = true;
              duplicateCandidate = existing;
              break;
            }
            
            // Check name similarity (80% match threshold)
            if (calculateNameSimilarity(name, existing.name) >= 0.8) {
              isDuplicate = true;
              duplicateCandidate = existing;
              break;
            }
          }

          if (isDuplicate && duplicateCandidate) {
            // Update existing candidate with new resume info if it's more recent or comprehensive
            if (text.length > (duplicateCandidate.resumeText?.length || 0)) {
              await storage.updateCandidate(duplicateCandidate.id, {
                resumeText: text,
                resumeFilename: file.originalname,
                skills: skills.length > 0 ? skills : duplicateCandidate.skills,
                phone: phone || duplicateCandidate.phone,
                location: location || duplicateCandidate.location,
                experience: experience || duplicateCandidate.experience,
                lastUpdated: new Date(),
              });
              
              duplicates.push({
                filename: file.originalname,
                candidateName: name,
                action: 'updated',
                existingId: duplicateCandidate.id
              });
            } else {
              duplicates.push({
                filename: file.originalname,
                candidateName: name,
                action: 'skipped',
                existingId: duplicateCandidate.id
              });
            }
          } else {
            // Use AI to enhance profile extraction
            console.log(`Enhancing profile with AI for: ${file.originalname}`);
            try {
              const enhancedProfile = await enhanceProfileWithAI(text, file.originalname);
              
              // Create new candidate with AI-enhanced data
              const candidate = await storage.createCandidate({
                name: enhancedProfile.name,
                email: enhancedProfile.email || undefined,
                phone: enhancedProfile.phone || undefined,
                location: enhancedProfile.location || undefined,
                currentRole: enhancedProfile.currentRole || undefined,
                currentCompany: enhancedProfile.currentCompany || undefined,
                experience: enhancedProfile.experience || undefined,
                skills: enhancedProfile.skills.length > 0 ? enhancedProfile.skills : undefined,
                portfolioUrl: enhancedProfile.portfolioUrl || undefined,
                linkedinUrl: enhancedProfile.linkedinUrl || undefined,
                githubUrl: enhancedProfile.githubUrl || undefined,
                summary: enhancedProfile.summary || undefined,
                resumeText: text,
                resumeFilename: file.originalname,
                resumeFileData: Buffer.from(fs.readFileSync(file.path)).toString('base64'),
                source: "AI-Enhanced Upload",
                status: "new",
                isFavorite: false,
              });
              
              processedCandidates.push(candidate);
              console.log(`AI-enhanced profile created for: ${enhancedProfile.name}`);
            } catch (aiError) {
              console.error(`AI enhancement failed for ${file.originalname}, using fallback:`, aiError);
              
              // Fallback to basic extraction
              const candidate = await storage.createCandidate({
                name,
                email: email || undefined,
                phone: phone || undefined,
                location: location || undefined,
                experience: experience || undefined,
                skills: skills.length > 0 ? skills : undefined,
                resumeText: text,
                resumeFilename: file.originalname,
                resumeFileData: Buffer.from(fs.readFileSync(file.path)).toString('base64'),
                source: "Bulk Upload",
                status: "new",
                isFavorite: false,
              });
              
              processedCandidates.push(candidate);
            }
          }
          
          // Clean up uploaded file
          fs.unlinkSync(file.path);
        } catch (error) {
          console.error(`Error processing file ${file.originalname}:`, error);
          errors.push({
            filename: file.originalname,
            error: error instanceof Error ? error.message : "Processing failed"
          });
          
          // Clean up file even if processing failed
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        }
      }

      res.json({ 
        message: `Successfully processed ${processedCandidates.length + duplicates.length} files`,
        candidates: processedCandidates.length,
        duplicates: duplicates.length,
        duplicateDetails: duplicates.length > 0 ? duplicates : undefined,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error) {
      console.error("Error uploading candidates:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to upload candidates" 
      });
    }
  });

  // Search candidates with advanced filters
  app.get("/api/candidates", async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = Math.min(parseInt(req.query.pageSize as string) || 20, 100);
      
      const filters: CandidateFilters = {
        search: req.query.search as string,
        location: req.query.location as string,
        experience: req.query.experience as string,
        status: req.query.status ? (req.query.status as string).split(',') : undefined,
        isFavorite: req.query.isFavorite === 'true' ? true : req.query.isFavorite === 'false' ? false : undefined,
        skills: req.query.skills ? (req.query.skills as string).split(',') : undefined,
        tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
      };

      const result = await storage.searchCandidates(filters, page, pageSize);
      res.json(result);
    } catch (error) {
      console.error("Error searching candidates:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to search candidates" 
      });
    }
  });

  // Get single candidate
  app.get("/api/candidates/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid candidate ID" });
      }

      const candidate = await storage.getCandidate(id);
      if (!candidate) {
        return res.status(404).json({ message: "Candidate not found" });
      }

      res.json(candidate);
    } catch (error) {
      console.error("Error fetching candidate:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to fetch candidate" 
      });
    }
  });

  // Update candidate
  app.patch("/api/candidates/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid candidate ID" });
      }

      await storage.updateCandidate(id, req.body);
      res.json({ message: "Candidate updated successfully" });
    } catch (error) {
      console.error("Error updating candidate:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to update candidate" 
      });
    }
  });

  // Bulk update candidates (must come before :id routes)
  app.patch("/api/candidates/bulk", async (req, res) => {
    try {
      const updateData = req.body as BulkCandidateUpdate;
      await storage.bulkUpdateCandidates(updateData);
      res.json({ message: `Updated ${updateData.candidateIds.length} candidates` });
    } catch (error) {
      console.error("Error bulk updating candidates:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to bulk update candidates" 
      });
    }
  });

  // Bulk delete candidates (must come before :id routes)
  app.delete("/api/candidates/bulk", async (req, res) => {
    try {
      const { candidateIds } = req.body;
      
      if (!candidateIds || !Array.isArray(candidateIds) || candidateIds.length === 0) {
        return res.status(400).json({ message: "No candidate IDs provided" });
      }

      // Delete each candidate
      let deletedCount = 0;
      const errors = [];

      for (const id of candidateIds) {
        try {
          const numericId = typeof id === 'string' ? parseInt(id) : id;
          if (isNaN(numericId)) {
            errors.push({ id, error: "Invalid candidate ID format" });
            continue;
          }
          await storage.deleteCandidate(numericId);
          deletedCount++;
        } catch (error) {
          errors.push({ id, error: error instanceof Error ? error.message : "Unknown error" });
        }
      }

      res.json({ 
        message: `Successfully deleted ${deletedCount} candidates`,
        deletedCount,
        errors: errors.length > 0 ? errors : undefined
      });
    } catch (error) {
      console.error("Error bulk deleting candidates:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to bulk delete candidates" 
      });
    }
  });

  // Delete single candidate (must come after bulk routes)
  app.delete("/api/candidates/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid candidate ID" });
      }

      await storage.deleteCandidate(id);
      res.json({ message: "Candidate deleted successfully" });
    } catch (error) {
      console.error("Error deleting candidate:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to delete candidate" 
      });
    }
  });

  // Mark candidate as favorite (must come after bulk routes)
  app.post("/api/candidates/:id/favorite", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { isFavorite } = req.body;
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid candidate ID" });
      }

      await storage.markCandidateAsFavorite(id, isFavorite);
      res.json({ message: "Favorite status updated" });
    } catch (error) {
      console.error("Error updating favorite status:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to update favorite status" 
      });
    }
  });

  // Download resume file
  app.get("/api/candidates/:id/resume", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid candidate ID" });
      }

      const candidate = await storage.getCandidate(id);
      if (!candidate) {
        return res.status(404).json({ message: "Candidate not found" });
      }

      if (!candidate.resumeFileData) {
        return res.status(404).json({ message: "Resume file not available" });
      }

      // Decode base64 file data
      const fileBuffer = Buffer.from(candidate.resumeFileData, 'base64');
      
      // Set appropriate headers
      res.setHeader('Content-Disposition', `attachment; filename="${candidate.resumeFilename}"`);
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Length', fileBuffer.length);
      
      res.send(fileBuffer);
    } catch (error) {
      console.error("Error downloading resume:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to download resume" 
      });
    }
  });

  // ===== JOB TEMPLATES LIBRARY =====
  
  // Create job template
  app.post("/api/job-templates", async (req, res) => {
    try {
      const validatedData = insertJobTemplateSchema.parse(req.body);
      const template = await storage.createJobTemplate(validatedData);
      res.json(template);
    } catch (error) {
      console.error("Error creating job template:", error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "Failed to create job template" 
      });
    }
  });

  // Search job templates
  app.get("/api/job-templates", async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = Math.min(parseInt(req.query.pageSize as string) || 20, 100);
      const search = req.query.search as string;
      const department = req.query.department as string;

      const result = await storage.searchJobTemplates(search, department, page, pageSize);
      res.json(result);
    } catch (error) {
      console.error("Error searching job templates:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to search job templates" 
      });
    }
  });

  // Get active job templates (for dropdowns)
  app.get("/api/job-templates/active", async (req, res) => {
    try {
      const templates = await storage.getActiveJobTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Error fetching active job templates:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to fetch active job templates" 
      });
    }
  });

  // Get single job template
  app.get("/api/job-templates/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid job template ID" });
      }

      const template = await storage.getJobTemplate(id);
      if (!template) {
        return res.status(404).json({ message: "Job template not found" });
      }

      res.json(template);
    } catch (error) {
      console.error("Error fetching job template:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to fetch job template" 
      });
    }
  });

  // Update job template
  app.patch("/api/job-templates/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid job template ID" });
      }

      await storage.updateJobTemplate(id, req.body);
      res.json({ message: "Job template updated successfully" });
    } catch (error) {
      console.error("Error updating job template:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to update job template" 
      });
    }
  });

  // Delete job template
  app.delete("/api/job-templates/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid job template ID" });
      }

      await storage.deleteJobTemplate(id);
      res.json({ message: "Job template deleted successfully" });
    } catch (error) {
      console.error("Error deleting job template:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to delete job template" 
      });
    }
  });

  // ===== ENHANCED ANALYSIS SYSTEM =====
  
  // Get analyses list with pagination
  app.get("/api/analyses", async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = Math.min(parseInt(req.query.pageSize as string) || 20, 100);

      const result = await storage.getAnalysesList(page, pageSize);
      res.json(result);
    } catch (error) {
      console.error("Error fetching analyses:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to fetch analyses" 
      });
    }
  });

  // Upload resumes and analyze immediately with enhanced duplicate detection
  app.post("/api/analyses/upload-and-analyze", upload.array('resumes', 50), async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      const { jobDescription, customPrompt } = req.body;
      
      if (!files || files.length === 0) {
        return res.status(400).json({ message: "No files uploaded" });
      }
      
      if (!jobDescription || !jobDescription.trim()) {
        return res.status(400).json({ message: "Job description is required" });
      }

      // Create analysis
      const analysis = await storage.createAnalysis({
        title: `Upload Analysis - ${new Date().toLocaleDateString()}`,
        description: jobDescription,
        batchSize: files.length,
      });

      // Get existing candidates for duplicate detection
      const existingSearch = await storage.searchCandidates({}, 1, 10000);
      const existingCandidates = existingSearch.candidates;

      // Process uploaded files with improved duplicate detection
      const processedResumes = [];
      let newCandidatesCreated = 0;
      let duplicatesFound = 0;
      let duplicatesUpdated = 0;
      
      for (const file of files) {
        try {
          const text = await extractTextFromFile(file.path, file.originalname);
          const name = extractCandidateName(text, file.originalname);
          const email = extractEmail(text);
          const phone = extractPhone(text);
          const location = extractLocation(text);
          const skills = extractSkills(text);
          const experience = extractExperience(text);
          
          // Create resume for analysis
          const resume = await storage.createResume({
            analysisId: analysis.id,
            filename: file.originalname,
            originalText: text,
            candidateName: name,
            email: email || undefined,
            phone: phone || undefined,
            location: location || undefined,
            skills: skills.length > 0 ? skills : undefined,
            experience: experience || undefined,
          });
          processedResumes.push(resume);
          
          // Enhanced duplicate detection
          let isDuplicate = false;
          let duplicateCandidate = null;

          for (const existing of existingCandidates) {
            // Email match (strongest indicator)
            if (email && existing.email && email.toLowerCase() === existing.email.toLowerCase()) {
              isDuplicate = true;
              duplicateCandidate = existing;
              console.log(`Duplicate found by email: ${email} matches ${existing.email}`);
              break;
            }
            
            // Name similarity check with improved threshold
            const similarity = calculateNameSimilarity(name, existing.name);
            if (similarity >= 0.75) { // Lowered threshold for better detection
              isDuplicate = true;
              duplicateCandidate = existing;
              console.log(`Duplicate found by name similarity: "${name}" vs "${existing.name}" (${Math.round(similarity * 100)}% match)`);
              break;
            }
          }

          if (!isDuplicate) {
            // Use AI to enhance profile extraction for new candidates
            try {
              const enhancedProfile = await enhanceProfileWithAI(text, file.originalname);
              
              const newCandidate = await storage.createCandidate({
                name: enhancedProfile.name,
                email: enhancedProfile.email || undefined,
                phone: enhancedProfile.phone || undefined,
                location: enhancedProfile.location || undefined,
                currentRole: enhancedProfile.currentRole || undefined,
                currentCompany: enhancedProfile.currentCompany || undefined,
                experience: enhancedProfile.experience || undefined,
                skills: enhancedProfile.skills.length > 0 ? enhancedProfile.skills : undefined,
                portfolioUrl: enhancedProfile.portfolioUrl || undefined,
                linkedinUrl: enhancedProfile.linkedinUrl || undefined,
                githubUrl: enhancedProfile.githubUrl || undefined,
                summary: enhancedProfile.summary || undefined,
                resumeFilename: file.originalname,
                resumeText: text,
                resumeFileData: Buffer.from(fs.readFileSync(file.path)).toString('base64'),
                status: 'new',
                source: 'AI-Enhanced Analysis Upload',
                isFavorite: false,
              });
              existingCandidates.push(newCandidate);
              newCandidatesCreated++;
              console.log(`AI-enhanced candidate created: ${enhancedProfile.name}`);
            } catch (aiError) {
              console.error(`AI enhancement failed for ${file.originalname}, using fallback:`, aiError);
              
              // Fallback to basic extraction
              const newCandidate = await storage.createCandidate({
                name,
                email: email || undefined,
                phone: phone || undefined,
                location: location || undefined,
                experience: experience || undefined,
                skills: skills.length > 0 ? skills : undefined,
                resumeFilename: file.originalname,
                resumeText: text,
                resumeFileData: Buffer.from(fs.readFileSync(file.path)).toString('base64'),
                status: 'new',
                source: 'upload',
                isFavorite: false,
              });
              existingCandidates.push(newCandidate);
              newCandidatesCreated++;
              console.log(`Created new candidate: ${name}`);
            }
          } else if (duplicateCandidate) {
            duplicatesFound++;
            // Update existing candidate if new resume is more comprehensive
            const existingTextLength = duplicateCandidate.resumeText?.length || 0;
            if (text.length > existingTextLength * 1.1) { // 10% more content threshold
              await storage.updateCandidate(duplicateCandidate.id, {
                resumeText: text,
                resumeFilename: file.originalname,
                resumeFileData: Buffer.from(fs.readFileSync(file.path)).toString('base64'),
                skills: skills.length > (duplicateCandidate.skills?.length || 0) ? skills : duplicateCandidate.skills,
                phone: phone || duplicateCandidate.phone,
                location: location || duplicateCandidate.location,
                experience: experience || duplicateCandidate.experience,
                updatedAt: new Date(),
              });
              duplicatesUpdated++;
              console.log(`Updated existing candidate: ${duplicateCandidate.name} with more comprehensive resume`);
            } else {
              console.log(`Skipped duplicate: ${duplicateCandidate.name} (existing resume is comprehensive)`);
            }
          }
          
          // Clean up uploaded file
          fs.unlinkSync(file.path);
        } catch (error) {
          console.error(`Error processing file ${file.originalname}:`, error);
          // Clean up file even if processing failed
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        }
      }

      // Start analysis in background  
      analyzeResumesInBackground(analysis.id, jobDescription, processedResumes, customPrompt?.trim() || undefined);

      const message = `Upload and analysis started. Created ${newCandidatesCreated} new candidates, found ${duplicatesFound} duplicates (${duplicatesUpdated} updated).`;

      res.json({ 
        message,
        analysisId: analysis.id,
        status: "processing",
        resumeCount: processedResumes.length,
        newCandidatesCreated,
        duplicatesFound,
        duplicatesUpdated,
        savedToDatabase: true
      });
    } catch (error) {
      console.error("Error in upload-and-analyze:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to upload and analyze" 
      });
    }
  });

  // Bulk analyze existing candidates
  app.post("/api/analyses/bulk", async (req, res) => {
    try {
      const { title, description, candidateIds, jobTemplateId, filters, batchSize, customPrompt } = req.body;
      
      if (!candidateIds || candidateIds.length === 0) {
        return res.status(400).json({ message: "No candidates selected for analysis" });
      }

      // Create analysis
      const analysis = await storage.createAnalysis({
        title,
        description,
        jobTemplateId,
        filters,
        batchSize: batchSize || Math.min(candidateIds.length, 50),
      });

      // Start analysis in background
      bulkAnalyzeCandidatesInBackground(analysis.id, description, candidateIds, customPrompt?.trim() || undefined);

      res.json({ 
        message: "Bulk analysis started", 
        analysisId: analysis.id,
        status: "processing",
        candidateCount: candidateIds.length
      });
    } catch (error) {
      console.error("Error starting bulk analysis:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to start bulk analysis" 
      });
    }
  });

  // ===== SAVED SEARCHES =====
  
  // Create saved search
  app.post("/api/saved-searches", async (req, res) => {
    try {
      const validatedData = insertSavedSearchSchema.parse(req.body);
      const search = await storage.createSavedSearch(validatedData);
      res.json(search);
    } catch (error) {
      console.error("Error creating saved search:", error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "Failed to create saved search" 
      });
    }
  });

  // Get saved searches
  app.get("/api/saved-searches", async (req, res) => {
    try {
      const searches = await storage.getSavedSearches();
      res.json(searches);
    } catch (error) {
      console.error("Error fetching saved searches:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to fetch saved searches" 
      });
    }
  });

  // ===== INTERVIEWS =====
  
  // Create interview
  app.post("/api/interviews", async (req, res) => {
    try {
      const validatedData = insertInterviewSchema.parse(req.body);
      const interview = await storage.createInterview(validatedData);
      res.json(interview);
    } catch (error) {
      console.error("Error creating interview:", error);
      res.status(400).json({ 
        message: error instanceof Error ? error.message : "Failed to create interview" 
      });
    }
  });
  
  // Get interviews
  app.get("/api/interviews", async (req, res) => {
    try {
      const { candidateId, status } = req.query;
      const interviews = await storage.getInterviews(
        candidateId ? parseInt(candidateId as string) : undefined,
        status as string
      );
      res.json(interviews);
    } catch (error) {
      console.error("Error fetching interviews:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to fetch interviews" 
      });
    }
  });

  // ===== ANALYSIS CHAT ENDPOINTS =====

  // Get conversation history for an analysis
  app.get("/api/analyses/:id/conversations", async (req, res) => {
    try {
      const analysisId = parseInt(req.params.id);
      if (isNaN(analysisId)) {
        return res.status(400).json({ message: "Invalid analysis ID" });
      }

      const conversations = await storage.getAnalysisConversations(analysisId);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to fetch conversations" 
      });
    }
  });

  // Send a message to analysis chat
  app.post("/api/analyses/:id/chat", async (req, res) => {
    try {
      const analysisId = parseInt(req.params.id);
      if (isNaN(analysisId)) {
        return res.status(400).json({ message: "Invalid analysis ID" });
      }

      const { message } = req.body;
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ message: "Message is required" });
      }

      // Get analysis and its results
      const analysis = await storage.getAnalysis(analysisId);
      if (!analysis) {
        return res.status(404).json({ message: "Analysis not found" });
      }

      if (analysis.status !== "completed") {
        return res.status(400).json({ message: "Analysis must be completed before chatting" });
      }

      const candidateResults = (analysis.results as CandidateResult[]) || [];

      // Get conversation history
      const conversations = await storage.getAnalysisConversations(analysisId);
      const conversationHistory = conversations.map(conv => ({
        role: conv.role as 'user' | 'assistant',
        message: conv.message
      }));

      // Generate AI response
      const chatRequest = {
        message,
        analysisId,
        jobDescription: analysis.jobDescription,
        candidateResults,
        conversationHistory
      };

      const aiResponse = await generateChatResponse(chatRequest);

      // Save user message
      await storage.createAnalysisConversation({
        analysisId,
        role: 'user',
        message
      });

      // Save AI response
      await storage.createAnalysisConversation({
        analysisId,
        role: 'assistant',
        message: aiResponse
      });

      res.json({ 
        message: aiResponse,
        success: true
      });
    } catch (error) {
      console.error("Error processing chat message:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to process chat message" 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

// Background analysis function (legacy support)
async function analyzeResumesInBackground(
  analysisId: number, 
  jobDescription: string, 
  resumes: any[],
  customPrompt?: string
) {
  try {
    // Update status to processing
    await storage.updateAnalysisStatus(analysisId, "processing");
    
    console.log(`Starting analysis ${analysisId} with ${resumes.length} resumes`);
    
    const input = {
      jobDescription,
      resumes: resumes.map(resume => ({
        id: resume.id,
        filename: resume.filename,
        content: resume.originalText,
      })),
      customPrompt
    };

    const result = await analyzeResumes(input);
    console.log(`Analysis completed for ${analysisId}, got ${result.candidates.length} candidates`);

    // Update each resume with analysis results
    for (const candidate of result.candidates) {
      await storage.updateResume(candidate.id, {
        score: candidate.score,
        rank: candidate.rank,
        analysis: candidate.analysis,
        tags: candidate.tags,
        isUnderdog: candidate.isUnderdog ? 1 : 0,
        underdogReason: candidate.underdogReason || null,
      });
    }

    // Update analysis status and results
    const candidateResults: CandidateResult[] = result.candidates.map(c => ({
      id: c.id,
      filename: resumes.find(r => r.id === c.id)?.filename || "",
      name: c.name,
      score: c.score,
      rank: c.rank,
      analysis: c.analysis,
      tags: c.tags,
      isUnderdog: c.isUnderdog,
      underdogReason: c.underdogReason,
      customPromptMatch: c.customPromptMatch || false,
      customPromptScore: c.customPromptScore || 0,
      customPromptReason: c.customPromptReason,
    }));

    await storage.updateAnalysisStatus(
      analysisId, 
      "completed", 
      candidateResults, 
      result.averageScore
    );

  } catch (error) {
    console.error("Background analysis failed:", error);
    await storage.updateAnalysisStatus(analysisId, "failed");
  }
}

// Enhanced bulk analysis function for enterprise features
async function bulkAnalyzeCandidatesInBackground(
  analysisId: number,
  jobDescription: string,
  candidateIds: number[],
  customPrompt?: string
) {
  try {
    await storage.updateAnalysisStatus(analysisId, "processing");

    // Get candidates from database
    const candidates = await storage.getCandidatesByIds(candidateIds);
    console.log(`Bulk analysis ${analysisId} found ${candidates.length} candidates for ${candidateIds.length} requested IDs`);
    
    if (candidates.length === 0) {
      console.error(`No candidates found for bulk analysis ${analysisId}`);
      await storage.updateAnalysisStatus(analysisId, "failed");
      return;
    }

    // Update total resumes count in analysis
    await storage.updateAnalysisStatus(analysisId, "processing", undefined, undefined, candidates.length);

    // Process in batches of 50 to handle large volumes
    const batchSize = 50;
    const batches = [];
    for (let i = 0; i < candidates.length; i += batchSize) {
      batches.push(candidates.slice(i, i + batchSize));
    }

    let allResults: any[] = [];
    let totalScore = 0;
    let rankCounter = 1;

    for (const batch of batches) {
      const input = {
        jobDescription,
        resumes: batch.map(candidate => ({
          id: candidate.id,
          filename: candidate.resumeFilename,
          content: candidate.resumeText,
        })),
        customPrompt
      };

      console.log(`Processing batch with ${batch.length} candidates for analysis ${analysisId}`);
      const result = await analyzeResumes(input);
      console.log(`Analysis completed for batch, got ${result.candidates.length} results`);
      
      // Store detailed analysis results in new table
      for (const candidate of result.candidates) {
        const analysisResult = await storage.createAnalysisResult({
          analysisId,
          candidateId: candidate.id,
          score: candidate.score,
          rank: rankCounter++,
          analysis: candidate.analysis,
          technicalScore: candidate.score * 0.4, // Breakdown by criteria
          experienceScore: candidate.score * 0.3,
          culturalFitScore: candidate.score * 0.15,
          growthPotentialScore: candidate.score * 0.15,
          tags: candidate.tags,
          isUnderdog: candidate.isUnderdog,
          underdogReason: candidate.underdogReason,
        });

        allResults.push({
          ...candidate,
          candidateId: candidate.id,
          email: batch.find(c => c.id === candidate.id)?.email,
          phone: batch.find(c => c.id === candidate.id)?.phone,
          location: batch.find(c => c.id === candidate.id)?.location,
          experience: batch.find(c => c.id === candidate.id)?.experience,
          currentRole: batch.find(c => c.id === candidate.id)?.currentRole,
          currentCompany: batch.find(c => c.id === candidate.id)?.currentCompany,
          customPromptMatch: candidate.customPromptMatch || false,
          customPromptScore: candidate.customPromptScore || 0,
          customPromptReason: candidate.customPromptReason,
        });

        totalScore += candidate.score;
      }
    }

    // Sort all results by score and update ranks
    allResults.sort((a, b) => b.score - a.score);
    allResults.forEach((result, index) => {
      result.rank = index + 1;
    });

    const averageScore = totalScore / allResults.length;

    // Update analysis with final results
    const finalResults = allResults.map(r => ({
      id: r.candidateId,
      filename: r.filename,
      name: r.name,
      score: r.score,
      rank: r.rank,
      analysis: r.analysis,
      tags: r.tags,
      isUnderdog: r.isUnderdog,
      underdogReason: r.underdogReason,
      customPromptMatch: r.customPromptMatch || false,
      customPromptScore: r.customPromptScore || 0,
      customPromptReason: r.customPromptReason,
      email: r.email,
      phone: r.phone,
      location: r.location,
      experience: r.experience,
      currentRole: r.currentRole,
      currentCompany: r.currentCompany,
    }));

    console.log(`Bulk analysis ${analysisId} completed with ${finalResults.length} results, average score: ${averageScore}`);
    
    await storage.updateAnalysisStatus(
      analysisId,
      "completed",
      finalResults,
      averageScore
    );

  } catch (error) {
    console.error("Bulk analysis failed:", error);
    console.error("Error details:", error instanceof Error ? error.message : String(error));
    console.error("Stack trace:", error instanceof Error ? error.stack : "No stack trace");
    await storage.updateAnalysisStatus(analysisId, "failed");
  }
}
