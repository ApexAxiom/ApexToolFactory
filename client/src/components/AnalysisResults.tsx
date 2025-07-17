import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AnalysisResponse, CandidateResult } from "@shared/schema";
import { ChartBar, CheckCircle, Star, ChevronDown, ChevronRight, User, Trophy, TrendingUp, Briefcase, MapPin, Phone, Mail, AlertCircle, Target, ThumbsUp, ThumbsDown, Save, FileText } from "lucide-react";
import { useState } from "react";
import { CandidateDetailModal } from "./CandidateDetailModal";
import { AnalysisChat } from "./AnalysisChat";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertJobTemplateSchema } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

interface AnalysisResultsProps {
  analysis?: AnalysisResponse;
  isLoading: boolean;
}

const templateFormSchema = insertJobTemplateSchema.extend({
  requirements: z.union([z.string(), z.array(z.string())]).optional(),
  skills: z.union([z.string(), z.array(z.string())]).optional(),
  tags: z.union([z.string(), z.array(z.string())]).optional(),
});

export default function AnalysisResults({ analysis, isLoading }: AnalysisResultsProps) {
  const [expandedCandidates, setExpandedCandidates] = useState<Set<number>>(new Set());
  const [selectedCandidateId, setSelectedCandidateId] = useState<number | null>(null);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const { toast } = useToast();

  // Debug logging to check what data we're receiving
  console.log('AnalysisResults received:', {
    analysis: analysis ? {
      id: analysis.id,
      status: analysis.status,
      averageScore: analysis.averageScore,
      resultsCount: analysis.results?.length || 0,
      firstResultScore: analysis.results?.[0]?.score,
      allScores: analysis.results?.map(r => r.score),
      fullAnalysis: analysis
    } : null,
    isLoading
  });

  // Form for creating template
  const templateForm = useForm<z.infer<typeof templateFormSchema>>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: {
      title: "",
      department: "",
      level: "",
      description: "",
      location: "",
      remoteType: "Remote",
      salaryRange: "",
      requirements: "",
      skills: "",
      tags: "",
    },
  });

  // Create template mutation
  const createTemplateMutation = useMutation({
    mutationFn: async (data: z.infer<typeof templateFormSchema>) => {
      // Convert string inputs to arrays for storage
      const processedData = {
        ...data,
        requirements: typeof data.requirements === 'string' 
          ? data.requirements.split(',').map(s => s.trim()).filter(Boolean)
          : data.requirements || [],
        skills: typeof data.skills === 'string' 
          ? data.skills.split(',').map(s => s.trim()).filter(Boolean) 
          : data.skills || [],
        tags: typeof data.tags === 'string' 
          ? data.tags.split(',').map(s => s.trim()).filter(Boolean)
          : data.tags || [],
      };
      
      const res = await apiRequest("POST", "/api/job-templates", processedData);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Template Created",
        description: "Job template has been created successfully from this analysis",
      });
      setIsTemplateDialogOpen(false);
      templateForm.reset();
      // Invalidate templates cache
      queryClient.invalidateQueries({ queryKey: ['/api/job-templates'] });
      queryClient.invalidateQueries({ queryKey: ['/api/job-templates/active'] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onTemplateSubmit = (data: z.infer<typeof templateFormSchema>) => {
    createTemplateMutation.mutate(data);
  };

  const toggleCandidate = (id: number) => {
    const newExpanded = new Set(expandedCandidates);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedCandidates(newExpanded);
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return "text-green-600 dark:text-green-400";
    if (score >= 70) return "text-blue-600 dark:text-blue-400";
    if (score >= 60) return "text-amber-600 dark:text-amber-400";
    return "text-slate-600 dark:text-slate-400";
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 85) return "bg-green-50 dark:bg-green-950";
    if (score >= 70) return "bg-blue-50 dark:bg-blue-950";
    if (score >= 60) return "bg-amber-50 dark:bg-amber-950";
    return "bg-slate-50 dark:bg-slate-950";
  };

  const getRankBadgeColor = (rank: number) => {
    if (rank === 1) return "bg-gradient-to-r from-green-500 to-emerald-500 text-white";
    if (rank === 2) return "bg-gradient-to-r from-blue-500 to-indigo-500 text-white";
    if (rank === 3) return "bg-gradient-to-r from-purple-500 to-pink-500 text-white";
    return "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200";
  };

  // Extract AI analysis details into strengths and weaknesses
  const parseAnalysisDetails = (analysis: string) => {
    const lines = analysis.split(/[.!?]+/).filter(line => line.trim());
    const strengths: string[] = [];
    const weaknesses: string[] = [];
    
    lines.forEach(line => {
      const lowerLine = line.toLowerCase();
      if (lowerLine.includes('strong') || lowerLine.includes('excellent') || lowerLine.includes('impressive') || 
          lowerLine.includes('extensive') || lowerLine.includes('proven') || lowerLine.includes('significant')) {
        strengths.push(line.trim());
      } else if (lowerLine.includes('lack') || lowerLine.includes('limited') || lowerLine.includes('missing') || 
                 lowerLine.includes('no evidence') || lowerLine.includes('concern') || lowerLine.includes('gap')) {
        weaknesses.push(line.trim());
      }
    });
    
    return { strengths, weaknesses, fullAnalysis: analysis };
  };

  if (!analysis && !isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <ChartBar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Ready to Analyze</h3>
          <p className="text-gray-600 dark:text-gray-400">Upload resumes and job description to get started with AI analysis.</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading || !analysis) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-6 w-48 mb-4" />
            <div className="grid grid-cols-3 gap-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-6 w-32 mb-4" />
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Ensure we have valid results array
  const results = analysis?.results || [];
  const strongMatches = results.filter(r => r && r.score >= 80).length || 0;
  const goodMatches = results.filter(r => r && r.score >= 70 && r.score < 80).length || 0;
  const avgScore = analysis?.averageScore || 0;

  return (
    <div className="space-y-6">
      {/* Analysis Overview Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold flex items-center">
              <Trophy className="h-6 w-6 text-primary mr-2" />
              Analysis Results
            </CardTitle>
            <div className="flex items-center space-x-3">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.location.reload()}
                className="text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <ChevronRight className="h-4 w-4 mr-2 rotate-180" />
                Clear Results
              </Button>
              {analysis?.status === "completed" && (
                <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <FileText className="h-4 w-4 mr-2" />
                      Save as Template
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Create Job Template from Analysis</DialogTitle>
                    </DialogHeader>
                    <Form {...templateForm}>
                      <form onSubmit={templateForm.handleSubmit(onTemplateSubmit)} className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={templateForm.control}
                            name="title"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Job Title</FormLabel>
                                <FormControl>
                                  <Input placeholder="Senior Software Engineer" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={templateForm.control}
                            name="department"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Department</FormLabel>
                                <FormControl>
                                  <Input placeholder="Engineering" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                          <FormField
                            control={templateForm.control}
                            name="level"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Level</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select level" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="Junior">Junior</SelectItem>
                                    <SelectItem value="Mid">Mid</SelectItem>
                                    <SelectItem value="Senior">Senior</SelectItem>
                                    <SelectItem value="Lead">Lead</SelectItem>
                                    <SelectItem value="Director">Director</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={templateForm.control}
                            name="location"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Location</FormLabel>
                                <FormControl>
                                  <Input placeholder="San Francisco" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={templateForm.control}
                            name="remoteType"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Remote Type</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="Remote">Remote</SelectItem>
                                    <SelectItem value="Hybrid">Hybrid</SelectItem>
                                    <SelectItem value="On-site">On-site</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={templateForm.control}
                          name="salaryRange"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Salary Range</FormLabel>
                              <FormControl>
                                <Input placeholder="$120,000 - $180,000" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={templateForm.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Job Description</FormLabel>
                              <FormControl>
                                <Textarea 
                                  placeholder="Write a comprehensive job description..."
                                  className="min-h-[120px]"
                                  {...field} 
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={templateForm.control}
                            name="requirements"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Requirements (comma-separated)</FormLabel>
                                <FormControl>
                                  <Textarea 
                                    placeholder="5+ years experience, Bachelor's degree..."
                                    {...field} 
                                    value={Array.isArray(field.value) ? field.value.join(', ') : field.value}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={templateForm.control}
                            name="skills"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Required Skills (comma-separated)</FormLabel>
                                <FormControl>
                                  <Textarea 
                                    placeholder="React, Node.js, TypeScript..."
                                    {...field} 
                                    value={Array.isArray(field.value) ? field.value.join(', ') : field.value}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={templateForm.control}
                          name="tags"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tags (comma-separated)</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="frontend, fullstack, startup..."
                                  {...field} 
                                  value={Array.isArray(field.value) ? field.value.join(', ') : field.value}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="flex justify-end space-x-3">
                          <DialogClose asChild>
                            <Button variant="outline">Cancel</Button>
                          </DialogClose>
                          <Button type="submit" disabled={createTemplateMutation.isPending}>
                            {createTemplateMutation.isPending ? "Creating..." : "Create Template"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              )}
              <div className="flex items-center text-sm">
                {analysis?.status === "completed" ? (
                  <div className="flex items-center text-green-600 dark:text-green-400">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    <span className="font-medium">Analysis Complete</span>
                  </div>
                ) : analysis?.status === "processing" ? (
                  <div className="flex items-center text-blue-600 dark:text-blue-400">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent mr-2"></div>
                    <span>Processing...</span>
                  </div>
                ) : (
                  <span className="text-gray-500">Pending</span>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Summary Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
              <User className="h-5 w-5 text-slate-600 dark:text-slate-400 mx-auto mb-2" />
              <div className="text-3xl font-bold text-slate-900 dark:text-slate-100">{analysis.totalResumes || 0}</div>
              <div className="text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wider">Candidates</div>
            </div>
            <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
              <Target className="h-5 w-5 text-green-600 dark:text-green-400 mx-auto mb-2" />
              <div className="text-3xl font-bold text-green-700 dark:text-green-300">{Math.round(avgScore)}</div>
              <div className="text-xs font-medium text-green-700 dark:text-green-400 uppercase tracking-wider">Avg Score</div>
            </div>
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
              <ThumbsUp className="h-5 w-5 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
              <div className="text-3xl font-bold text-blue-700 dark:text-blue-300">{strongMatches}</div>
              <div className="text-xs font-medium text-blue-700 dark:text-blue-400 uppercase tracking-wider">Strong Matches</div>
            </div>
            <div className="text-center p-4 bg-amber-50 dark:bg-amber-950 rounded-lg border border-amber-200 dark:border-amber-800">
              <TrendingUp className="h-5 w-5 text-amber-600 dark:text-amber-400 mx-auto mb-2" />
              <div className="text-3xl font-bold text-amber-700 dark:text-amber-300">{goodMatches}</div>
              <div className="text-xs font-medium text-amber-700 dark:text-amber-400 uppercase tracking-wider">Good Matches</div>
            </div>
          </div>

          {/* Quick Insights */}
          {analysis.results && analysis.results.length > 0 && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">Key Insight</p>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    {analysis.results[0].name} is your top match with a {analysis.results[0].score || 0}% compatibility score.
                    {analysis.results.filter(r => r.isUnderdog).length > 0 && 
                      ` Don't overlook ${analysis.results.find(r => r.isUnderdog)?.name} - marked as an underdog pick with unique potential.`
                    }
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed Rankings */}
      {results && results.length > 0 && (
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="text-xl">Candidate Rankings</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Professional AI analysis based on skills, experience, and job requirements
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {results.map((candidate) => {
                const isExpanded = expandedCandidates.has(candidate.id);
                const { strengths, weaknesses, fullAnalysis } = parseAnalysisDetails(candidate.analysis);
                
                return (
                  <div key={candidate.id} className={`transition-all duration-200 ${
                    candidate.isUnderdog 
                      ? 'bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-l-4 border-amber-500' 
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                  }`}>
                    <div 
                      className="p-6 cursor-pointer"
                      onClick={() => toggleCandidate(candidate.id)}
                    >
                      {/* Header Row */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-start space-x-4 flex-1">
                          {/* Rank Badge */}
                          <div className="flex-shrink-0">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg shadow-md ${getRankBadgeColor(candidate.rank)}`}>
                              {candidate.rank === 1 ? <Trophy className="h-6 w-6" /> : candidate.rank}
                            </div>
                          </div>
                          
                          {/* Candidate Info */}
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h4 
                                className="text-xl font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 cursor-pointer underline-offset-4 hover:underline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedCandidateId(candidate.id);
                                }}
                              >
                                {candidate.name}
                              </h4>
                              {candidate.rank === 1 && (
                                <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0">
                                  <Trophy className="h-3 w-3 mr-1" />
                                  Top Match
                                </Badge>
                              )}
                              {candidate.isUnderdog && (
                                <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">
                                  <Star className="h-3 w-3 mr-1" />
                                  Underdog Pick
                                </Badge>
                              )}
                              {candidate.customPromptMatch && (
                                <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 shadow-lg">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Custom Match
                                </Badge>
                              )}
                            </div>

                            {/* Score and Progress */}
                            <div className="flex items-center space-x-6 mb-4">
                              <div className={`flex items-baseline space-x-1 px-3 py-1 rounded-lg ${getScoreBgColor(candidate.score)}`}>
                                <span className={`text-3xl font-bold ${getScoreColor(candidate.score)}`}>
                                  {candidate.score ?? 0}
                                </span>
                                <span className="text-sm text-gray-600 dark:text-gray-400">%</span>
                              </div>
                              <div className="flex-1 max-w-md">
                                <Progress value={candidate.score || 0} className="h-3" />
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Overall Match Score</p>
                              </div>
                            </div>

                            {/* Contact Info & Skills */}
                            <div className="flex flex-wrap items-center gap-4 mb-4 text-sm text-gray-600 dark:text-gray-400">
                              {candidate.email && (
                                <div className="flex items-center space-x-1">
                                  <Mail className="h-4 w-4" />
                                  <span>{candidate.email}</span>
                                </div>
                              )}
                              {candidate.phone && (
                                <div className="flex items-center space-x-1">
                                  <Phone className="h-4 w-4" />
                                  <span>{candidate.phone}</span>
                                </div>
                              )}
                              {candidate.location && (
                                <div className="flex items-center space-x-1">
                                  <MapPin className="h-4 w-4" />
                                  <span>{candidate.location}</span>
                                </div>
                              )}
                              {candidate.experience && (
                                <div className="flex items-center space-x-1">
                                  <Briefcase className="h-4 w-4" />
                                  <span>{candidate.experience}</span>
                                </div>
                              )}
                            </div>

                            {/* Key Skills Tags */}
                            {candidate.tags && candidate.tags.length > 0 && (
                              <div className="flex flex-wrap gap-2 mb-4">
                                {candidate.tags.slice(0, 8).map((tag, index) => (
                                  <Badge 
                                    key={index} 
                                    variant="secondary" 
                                    className="text-xs font-medium"
                                  >
                                    {tag}
                                  </Badge>
                                ))}
                                {candidate.tags.length > 8 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{candidate.tags.length - 8} more
                                  </Badge>
                                )}
                              </div>
                            )}

                            {/* Expanded Analysis Details */}
                            {isExpanded && (
                              <div className="mt-4 space-y-4">
                                <Separator />
                                
                                {/* Strengths & Weaknesses Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {/* Strengths */}
                                  {strengths.length > 0 && (
                                    <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-4">
                                      <h5 className="font-semibold text-green-800 dark:text-green-200 mb-2 flex items-center">
                                        <ThumbsUp className="h-4 w-4 mr-2" />
                                        Key Strengths
                                      </h5>
                                      <ul className="space-y-1">
                                        {strengths.slice(0, 3).map((strength, idx) => (
                                          <li key={idx} className="text-sm text-green-700 dark:text-green-300">
                                            • {strength}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  
                                  {/* Areas for Consideration */}
                                  {weaknesses.length > 0 && (
                                    <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-4">
                                      <h5 className="font-semibold text-amber-800 dark:text-amber-200 mb-2 flex items-center">
                                        <AlertCircle className="h-4 w-4 mr-2" />
                                        Areas to Consider
                                      </h5>
                                      <ul className="space-y-1">
                                        {weaknesses.slice(0, 3).map((weakness, idx) => (
                                          <li key={idx} className="text-sm text-amber-700 dark:text-amber-300">
                                            • {weakness}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>

                                {/* Custom Prompt Match Analysis */}
                                {candidate.customPromptMatch && candidate.customPromptReason && (
                                  <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-4 border border-green-200 dark:border-green-800">
                                    <h5 className="font-semibold text-green-800 dark:text-green-200 mb-2 flex items-center">
                                      <CheckCircle className="h-4 w-4 mr-2" />
                                      Custom Criteria Match ({candidate.customPromptScore}%)
                                    </h5>
                                    <p className="text-sm text-green-700 dark:text-green-300 leading-relaxed">
                                      {candidate.customPromptReason}
                                    </p>
                                  </div>
                                )}

                                {/* Full Analysis */}
                                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4">
                                  <h5 className="font-semibold text-gray-800 dark:text-gray-200 mb-2">Full Analysis</h5>
                                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                    {candidate.isUnderdog && (
                                      <span className="font-semibold text-amber-600 dark:text-amber-400">
                                        Underdog Reasoning: {candidate.underdogReason}
                                        <br /><br />
                                      </span>
                                    )}
                                    {fullAnalysis}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Expand/Collapse Button */}
                        <Button variant="ghost" size="icon" className="ml-4">
                          {isExpanded ? (
                            <ChevronDown className="h-5 w-5" />
                          ) : (
                            <ChevronRight className="h-5 w-5" />
                          )}
                        </Button>
                      </div>
                      
                      {/* Quick Preview for collapsed state - Show more useful info immediately */}
                      {!isExpanded && (
                        <div className="ml-16 space-y-2">
                          {/* Current Role & Company */}
                          {(candidate.currentRole || candidate.currentCompany) && (
                            <div className="flex items-center text-sm text-gray-700 dark:text-gray-300">
                              <Briefcase className="h-4 w-4 mr-2 text-gray-500" />
                              <span>
                                {candidate.currentRole}
                                {candidate.currentRole && candidate.currentCompany && " at "}
                                {candidate.currentCompany}
                              </span>
                            </div>
                          )}
                          
                          {/* Key highlights from analysis */}
                          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                            {candidate.analysis.split('.')[0]}.
                            {candidate.isUnderdog && (
                              <span className="text-amber-600 dark:text-amber-400 font-medium">
                                {" "}✨ Underdog potential identified.
                              </span>
                            )}
                            {candidate.customPromptMatch && (
                              <span className="text-green-600 dark:text-green-400 font-medium">
                                {" "}🎯 Meets custom criteria.
                              </span>
                            )}
                          </p>
                          
                          {/* Quick stats */}
                          <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                            {candidate.experience && (
                              <span>Experience: {candidate.experience}</span>
                            )}
                            {candidate.tags && candidate.tags.length > 0 && (
                              <span>{candidate.tags.length} skills identified</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {analysis?.results && analysis.results.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No Results Found</h3>
            <p className="text-gray-600 dark:text-gray-400">The analysis didn't return any candidate results. Please try again.</p>
          </CardContent>
        </Card>
      )}

      {/* Analysis Chat Component */}
      {analysis?.status === "completed" && analysis.results && analysis.results.length > 0 && (
        <AnalysisChat analysis={analysis} />
      )}

      {/* Candidate Detail Modal */}
      <CandidateDetailModal
        candidateId={selectedCandidateId}
        isOpen={!!selectedCandidateId}
        onClose={() => setSelectedCandidateId(null)}
      />
    </div>
  );
}
