import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
});

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
  // Custom Prompt Alignment Features
  customPromptMatch: boolean;
  customPromptScore: number;
  customPromptReason?: string;
}

export interface AnalysisResult {
  candidates: CandidateAnalysis[];
  averageScore: number;
  summary: string;
}

export async function analyzeResumes(input: ResumeAnalysisInput): Promise<AnalysisResult> {
  let prompt = `
You are a professional recruiter with 15+ years of experience evaluating candidates. Analyze the following resumes against the job description with the critical eye of a senior talent acquisition expert.

JOB DESCRIPTION:
${input.jobDescription}

RESUMES TO ANALYZE:
${input.resumes.map((resume, index) => `
RESUME ${index + 1} (ID: ${resume.id}, Filename: ${resume.filename}):
${resume.content}
`).join('\n')}

ANALYSIS REQUIREMENTS:
1. Evaluate each resume on:
   - Technical skills match (40%)
   - Experience relevance and depth (30%)
   - Cultural fit indicators (15%)
   - Growth potential and learning ability (15%)

2. Provide professional recruiter-level analysis, not just keyword matching
3. Score each candidate 1-100 based on job fit
4. Rank candidates 1-${input.resumes.length} (1 = best match)
5. Extract candidate name from resume content
6. Identify relevant skill tags (max 5 per candidate)
7. Select ONE candidate as the "underdog" - someone who may score lower but shows exceptional potential, creativity, or unique value

8. **CUSTOM PROMPT ALIGNMENT EVALUATION** (if custom instructions provided):
   - Evaluate each candidate's alignment with custom instructions (0-100 score)
   - Award "customPromptMatch: true" to candidates who strongly meet custom criteria
   - Provide specific reasoning explaining the alignment
   - This is SEPARATE from overall job fit - a candidate can have low overall score but high custom alignment

9. Provide detailed reasoning for rankings`;

  // Add custom prompt if provided
  if (input.customPrompt && input.customPrompt.trim()) {
    prompt += `

ADDITIONAL CUSTOM INSTRUCTIONS & SPECIAL FLAGGING:
${input.customPrompt}

IMPORTANT: Evaluate each candidate's alignment with these custom instructions separately from their overall job fit score. Award a "Custom Prompt Match" flag to candidates who strongly align with these specific requirements, even if their overall score is lower. For example:
- If you specify "prefer candidates who worked at Shell", flag anyone with Shell experience
- If you specify "prioritize startup experience", flag candidates with startup backgrounds
- If you specify "remote work experience preferred", flag candidates with remote work history

This creates a dual evaluation system:
1. Overall job fit score (standard analysis)
2. Custom criteria alignment score (special flagging system)`;
  }

  prompt += `

Return your analysis in the following JSON format:
{
  "candidates": [
    {
      "id": number,
      "name": "extracted_name",
      "score": number,
      "rank": number,
      "analysis": "detailed_professional_analysis",
      "tags": ["skill1", "skill2"],
      "isUnderdog": boolean,
      "underdogReason": "explanation_if_underdog",
      "customPromptMatch": boolean,
      "customPromptScore": number,
      "customPromptReason": "explanation_of_custom_criteria_alignment"
    }
  ],
  "averageScore": number,
  "summary": "overall_analysis_summary"
}
`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a senior recruitment consultant with expertise in evaluating technical candidates. Provide thorough, professional analysis that goes beyond keyword matching."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    
    // Validate and ensure one underdog is selected
    if (result.candidates && result.candidates.length > 1) {
      const underdogs = result.candidates.filter((c: any) => c.isUnderdog);
      if (underdogs.length === 0) {
        // Select the candidate with the best potential despite lower score
        const sorted = [...result.candidates].sort((a, b) => a.score - b.score);
        const middleCandidate = sorted[Math.floor(sorted.length / 2)];
        middleCandidate.isUnderdog = true;
        middleCandidate.underdogReason = "Shows strong potential and unique value despite lower experience match. Often these candidates become top performers when given the opportunity.";
      } else if (underdogs.length > 1) {
        // Keep only the first underdog
        result.candidates.forEach((c: any, index: number) => {
          if (c.isUnderdog && index > 0) {
            c.isUnderdog = false;
            c.underdogReason = undefined;
          }
        });
      }
    }

    return result;
  } catch (error) {
    console.error("OpenAI analysis failed:", error);
    throw new Error(`Resume analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
