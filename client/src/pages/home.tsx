import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import FileUpload from "@/components/FileUpload";
import JobDescriptionInput from "@/components/JobDescriptionInput";
import AnalysisResults from "@/components/AnalysisResults";
import LoadingOverlay from "@/components/LoadingOverlay";
import { DatabaseInfo } from "@/components/DatabaseInfo";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Upload, FileText, Users, Star, Briefcase, Calendar, Database } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { Analysis, AnalysisResponse, JobTemplate, Candidate } from "@shared/schema";

export default function Home() {
  const [files, setFiles] = useState<File[]>([]);
  const [jobDescription, setJobDescription] = useState("");
  const [selectedJobTemplateId, setSelectedJobTemplateId] = useState<number | null>(null);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<number[]>([]);
  const [currentAnalysisId, setCurrentAnalysisId] = useState<number | null>(null);
  const [candidateSearch, setCandidateSearch] = useState("");
  const [sourceType, setSourceType] = useState<"upload" | "database">("upload");
  const [customPrompt, setCustomPrompt] = useState("");
  const { toast } = useToast();
  const [showLoadingOverlay, setShowLoadingOverlay] = useState(false);
  const [analysisData, setAnalysisData] = useState<AnalysisResponse | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);

  // Check for analysis ID in URL parameters
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const analysisParam = urlParams.get('analysis');
    if (analysisParam) {
      const analysisId = parseInt(analysisParam);
      if (!isNaN(analysisId)) {
        setCurrentAnalysisId(analysisId);
        // Clear URL parameter
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, []);

  // Query for job templates
  const { data: jobTemplates } = useQuery<JobTemplate[]>({
    queryKey: ['/api/job-templates/active'],
  });

  // Query for candidates with search
  const { data: candidatesData } = useQuery<{ candidates: Candidate[]; total: number }>({
    queryKey: ['/api/candidates', { search: candidateSearch, page: 1, pageSize: 100 }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: '1',
        pageSize: '100',
        ...(candidateSearch && { search: candidateSearch })
      });
      const res = await fetch(`/api/candidates?${params}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch candidates');
      return res.json();
    },
  });

  // Manual polling to bypass React Query caching issues
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    
    const fetchAnalysis = async () => {
      if (!currentAnalysisId) {
        setAnalysisData(null);
        setAnalysisLoading(false);
        return;
      }

      setAnalysisLoading(true);
      
      try {
        const response = await fetch(`/api/analyses/${currentAnalysisId}?t=${Date.now()}`, {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch analysis: ${response.statusText}`);
        }
        
        const data = await response.json();
        setAnalysisData(data);
        
        console.log('Polling analysis:', { 
          id: currentAnalysisId, 
          status: data?.status, 
          resultsLength: data?.results?.length,
          hasResults: !!(data?.results && data.results.length > 0),
          averageScore: data?.averageScore
        });
        
        // Stop polling if analysis is complete with valid scores
        const isProcessing = data?.status === 'processing';
        const hasIncompleteData = !data?.results || data.results.length === 0 || data.results.every(r => r.score === 0);
        
        if (!isProcessing && !hasIncompleteData) {
          // Analysis is complete
          if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
          }
        }
        
      } catch (error) {
        console.error('Analysis fetch error:', error);
        toast({
          title: "Connection Error",
          description: "Lost connection to the server. Please refresh the page.",
          variant: "destructive",
        });
        setCurrentAnalysisId(null);
      } finally {
        setAnalysisLoading(false);
      }
    };

    if (currentAnalysisId) {
      // Fetch immediately
      fetchAnalysis();
      
      // Then poll every 2 seconds
      intervalId = setInterval(fetchAnalysis, 2000);
    } else {
      setAnalysisData(null);
      setAnalysisLoading(false);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [currentAnalysisId, toast]);

  // Upload and analyze mutation
  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (sourceType === "upload") {
        const formData = new FormData();
        formData.append('jobDescription', jobDescription);
        if (customPrompt.trim()) {
          formData.append('customPrompt', customPrompt);
        }
        files.forEach(file => {
          formData.append('resumes', file);
        });

        const res = await fetch('/api/analyses/upload-and-analyze', {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });

        if (!res.ok) {
          const error = await res.text();
          throw new Error(error || res.statusText);
        }

        return res.json();
      } else {
        // Analyze from database
        const res = await apiRequest('POST', '/api/analyses/bulk', {
          title: `Analysis - ${new Date().toLocaleDateString()}`,
          description: jobDescription,
          candidateIds: selectedCandidateIds,
          customPrompt: customPrompt.trim() || undefined,
        });

        return res.json();
      }
    },
    onSuccess: (data) => {
      setCurrentAnalysisId(data.analysisId);
      toast({
        title: "Analysis Started",
        description: `Processing ${data.resumeCount || data.candidateCount} candidates...`,
      });
      // Clear selections
      setFiles([]);
      setSelectedCandidateIds([]);
      // Force complete cache invalidation for this analysis
      queryClient.removeQueries({ queryKey: [`/api/analyses/${data.analysisId}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/analyses/${data.analysisId}`] });
    },
    onError: (error) => {
      toast({
        title: "Analysis Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Upload to database mutation
  const uploadToDatabaseMutation = useMutation({
    mutationFn: async (filesToUpload: File[]) => {
      const formData = new FormData();
      filesToUpload.forEach(file => formData.append('resumes', file));
      
      const res = await fetch('/api/candidates/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!res.ok) throw new Error('Upload failed');
      return res.json();
    },
    onSuccess: (data) => {
      const { candidates = 0, duplicates = 0, duplicateDetails = [] } = data;
      let description = `Added ${candidates} new candidates to database`;
      
      if (duplicates > 0) {
        const updated = duplicateDetails.filter((d: any) => d.action === 'updated').length;
        const skipped = duplicateDetails.filter((d: any) => d.action === 'skipped').length;
        description += `. Found ${duplicates} duplicates: ${updated} updated, ${skipped} skipped.`;
      }
      
      toast({
        title: "Upload Complete",
        description,
      });
      setFiles([]);
      queryClient.invalidateQueries({ queryKey: ['/api/candidates'] });
    },
    onError: (error) => {
      toast({
        title: "Upload Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const hasJobDescription = jobDescription.trim() || selectedJobTemplateId;
    const hasCandidates = (sourceType === "upload" && files.length > 0) || 
                         (sourceType === "database" && selectedCandidateIds.length > 0);
    
    if (!hasJobDescription || !hasCandidates) {
      toast({
        title: "Missing Information",
        description: "Please provide both job description and candidates",
        variant: "destructive",
      });
      return;
    }

    // If job template selected, use its description
    if (selectedJobTemplateId) {
      const template = jobTemplates?.find(t => t.id === selectedJobTemplateId);
      if (template) {
        setJobDescription(template.description);
      }
    }

    uploadMutation.mutate();
  };

  const toggleCandidate = (candidateId: number) => {
    setSelectedCandidateIds(prev => 
      prev.includes(candidateId)
        ? prev.filter(id => id !== candidateId)
        : [...prev, candidateId]
    );
  };

  const isProcessing = analysisData?.status === 'processing' || uploadMutation.isPending;
  const candidates = candidatesData?.candidates || [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 pb-16">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">TalentScope Hub</h1>
        <p className="mt-2 text-gray-600">
          AI-powered candidate analysis and job matching
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Total Candidates</p>
                <p className="text-2xl font-semibold text-gray-900">{candidatesData?.total || 0}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Job Templates</p>
                <p className="text-2xl font-semibold text-gray-900">{jobTemplates?.length || 0}</p>
              </div>
              <Briefcase className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Favorites</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {candidates.filter(c => c.isFavorite).length}
                </p>
              </div>
              <Star className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Ready to Analyze</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {sourceType === "upload" ? files.length : selectedCandidateIds.length}
                </p>
              </div>
              <FileText className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Job Description Section */}
          <Card>
            <CardHeader>
              <CardTitle>Job Requirements</CardTitle>
              <CardDescription>
                Enter a job description or select from your templates
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Use Job Template</label>
                <Select
                  value={selectedJobTemplateId?.toString() || ""}
                  onValueChange={(value) => {
                    if (value === "none") {
                      setSelectedJobTemplateId(null);
                    } else {
                      const id = parseInt(value);
                      setSelectedJobTemplateId(id);
                      const template = jobTemplates?.find(t => t.id === id);
                      if (template) {
                        setJobDescription(template.description);
                      }
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a job template (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {jobTemplates?.map((template) => (
                      <SelectItem key={template.id} value={template.id.toString()}>
                        <div className="flex items-center space-x-2">
                          <Briefcase className="h-4 w-4" />
                          <span>{template.title}</span>
                          {template.department && (
                            <Badge variant="secondary" className="text-xs">
                              {template.department}
                            </Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium">Or Enter Job Description</label>
                <JobDescriptionInput
                  value={jobDescription}
                  onChange={setJobDescription}
                  disabled={isProcessing}
                />
              </div>
              
              {/* Custom AI Prompt Section */}
              <div className="space-y-2">
                <Label htmlFor="custom-prompt" className="text-sm font-medium">
                  Custom AI Analysis Instructions (Optional)
                </Label>
                <Textarea
                  id="custom-prompt"
                  placeholder="Add specific instructions for how AI should analyze the resumes against the job description. Leave blank for standard analysis."
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  disabled={isProcessing}
                  className="min-h-[100px]"
                />
                <p className="text-xs text-gray-500">
                  Example: "Focus on technical skills and prioritize candidates with startup experience" or "Emphasize cultural fit and communication skills"
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Candidates Section */}
          <Card>
            <CardHeader>
              <CardTitle>Select Candidates</CardTitle>
              <CardDescription>
                Upload new resumes or select from your candidate database
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={sourceType} onValueChange={(v) => setSourceType(v as "upload" | "database")}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="upload">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload New
                  </TabsTrigger>
                  <TabsTrigger value="database">
                    <Users className="h-4 w-4 mr-2" />
                    From Database
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="upload" className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <div className="flex items-start">
                      <FileText className="h-5 w-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                      <div>
                        <h3 className="text-sm font-medium text-blue-900">Auto-Save to Database</h3>
                        <p className="text-sm text-blue-700 mt-1">
                          Every uploaded resume is automatically saved to your candidate database for future searches and analyses.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <FileUpload
                    files={files}
                    onFilesChange={setFiles}
                    disabled={isProcessing}
                    maxFiles={50}
                  />
                  
                  {files.length > 0 && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-900">
                          {files.length} files ready for analysis
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          Auto-saving to database
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600">
                        These resumes will be analyzed and permanently added to your searchable candidate database.
                      </p>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="database" className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                    <div className="flex items-start">
                      <Search className="h-5 w-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
                      <div>
                        <h3 className="text-sm font-medium text-green-900">Search Database by Job Description</h3>
                        <p className="text-sm text-green-700 mt-1">
                          Enter your job description above, then search and select matching candidates from your database for AI analysis.
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Search candidates by name, skills, location, or experience..."
                        value={candidateSearch}
                        onChange={(e) => setCandidateSearch(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    
                    {candidates.length > 0 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">
                          {candidates.length} candidates found
                        </span>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedCandidateIds(candidates.map(c => c.id))}
                          >
                            Select All
                          </Button>
                          <Button
                            variant="outline" 
                            size="sm"
                            onClick={() => setSelectedCandidateIds(candidates.filter(c => c.isFavorite).map(c => c.id))}
                          >
                            Select Favorites
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <ScrollArea className="h-[300px] border rounded-md p-4">
                    {candidates.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        No candidates found. Upload resumes to your database first.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {candidates.map((candidate) => (
                          <div
                            key={candidate.id}
                            className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50"
                          >
                            <Checkbox
                              checked={selectedCandidateIds.includes(candidate.id)}
                              onCheckedChange={() => toggleCandidate(candidate.id)}
                            />
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <span className="font-medium">{candidate.name}</span>
                                {candidate.isFavorite && (
                                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                )}
                                <Badge variant="secondary" className="text-xs">
                                  {candidate.status || 'new'}
                                </Badge>
                              </div>
                              <div className="text-sm text-gray-600">
                                {candidate.currentRole && `${candidate.currentRole} at ${candidate.currentCompany}`}
                                {candidate.location && ` • ${candidate.location}`}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                  
                  {selectedCandidateIds.length > 0 && (
                    <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-blue-900">
                          {selectedCandidateIds.length} candidates selected for analysis
                        </span>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setSelectedCandidateIds([])}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          Clear All
                        </Button>
                      </div>
                      <p className="text-xs text-blue-700 mt-1">
                        Click "Analyze Candidates" below to match these profiles against your job description.
                      </p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Database Information Panel */}
        <div className="mb-8">
          <DatabaseInfo 
            totalCandidates={candidatesData?.total || 0}
            favorites={candidates.filter(c => c.isFavorite).length}
          />
        </div>

        <div className="flex justify-center">
          <Button
            type="submit"
            size="lg"
            disabled={isProcessing || 
              (!jobDescription.trim() && !selectedJobTemplateId) ||
              (sourceType === "upload" ? files.length === 0 : selectedCandidateIds.length === 0)
            }
            className="min-w-[200px]"
          >
            {isProcessing ? "Processing..." : "Analyze Candidates"}
          </Button>
        </div>
      </form>

      {currentAnalysisId && (
        <div className="mt-8">
          <AnalysisResults 
            analysis={analysisData || undefined} 
            isLoading={analysisLoading}
          />
        </div>
      )}

      <LoadingOverlay visible={uploadMutation.isPending || isProcessing} />
    </div>
  );
}