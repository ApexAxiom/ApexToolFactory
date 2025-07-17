import { analyzeResumes as claudeAnalyze } from "./claude";
import { analyzeResumes as openaiAnalyze } from "./openai";

export interface ResumeAnalysisInput {
  jobDescription: string;
  resumes: Array<{
    id: number;
    filename: string;
    content: string;
  }>;
  customPrompt?: string;
}

export interface CandidateAnalysis {
  id: number;
  name: string;
  score: number;
  rank: number;
  analysis: string;
  tags: string[];
  isUnderdog: boolean;
  underdogReason?: string;
}

export interface AnalysisResult {
  candidates: CandidateAnalysis[];
  averageScore: number;
  summary: string;
}

// Backup system between Claude and OpenAI
export async function analyzeResumes(input: ResumeAnalysisInput): Promise<AnalysisResult> {
  // Try Claude first (premium quality)
  try {
    console.log("Attempting analysis with Claude Sonnet 4...");
    const result = await claudeAnalyze(input);
    console.log("Claude analysis completed successfully");
    return result;
  } catch (claudeError) {
    console.warn("Claude analysis failed, falling back to OpenAI:", claudeError);
    
    // Check if it's a credit/auth issue vs other error
    const errorMessage = claudeError instanceof Error ? claudeError.message : String(claudeError);
    if (errorMessage.includes("credit balance") || errorMessage.includes("authentication")) {
      console.log("Claude credits/auth issue detected, using OpenAI backup");
    }
    
    // Fallback to OpenAI
    try {
      console.log("Attempting analysis with OpenAI GPT-4o...");
      const result = await openaiAnalyze(input);
      console.log("OpenAI analysis completed successfully");
      return result;
    } catch (openaiError) {
      console.error("Both Claude and OpenAI failed:", { claudeError, openaiError });
      throw new Error(`AI analysis failed: Claude (${errorMessage}) and OpenAI (${openaiError instanceof Error ? openaiError.message : String(openaiError)})`);
    }
  }
}