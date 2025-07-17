import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { CandidateDetailModal } from "@/components/CandidateDetailModal";
import { 
  Search, 
  Upload, 
  Star, 
  Mail, 
  Phone, 
  MapPin,
  Briefcase,
  Download,
  Filter,
  Users,
  Plus,
  FileText,
  Trash2,
  CheckSquare,
  Square
} from "lucide-react";
import type { Candidate, CandidateSearchResult, JobTemplate } from "@shared/schema";

const bulkAnalysisSchema = z.object({
  title: z.string().min(1, "Title is required"),
  jobTemplateId: z.number().optional(),
  description: z.string().min(1, "Description is required"),
});

export default function Candidates() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedCandidates, setSelectedCandidates] = useState<number[]>([]);
  const [selectedCandidateId, setSelectedCandidateId] = useState<number | null>(null);
  const [showAnalysisDialog, setShowAnalysisDialog] = useState(false);
  const { toast } = useToast();

  const analysisForm = useForm<z.infer<typeof bulkAnalysisSchema>>({
    resolver: zodResolver(bulkAnalysisSchema),
    defaultValues: {
      title: "",
      description: "",
    },
  });

  // Query for job templates
  const { data: jobTemplates } = useQuery<JobTemplate[]>({
    queryKey: ['/api/job-templates/active'],
    queryFn: async () => {
      const res = await fetch('/api/job-templates/active', {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch job templates');
      return res.json();
    },
  });

  // Query for candidates with filters
  const { data: candidatesData, isLoading } = useQuery<CandidateSearchResult>({
    queryKey: ['/api/candidates', page, searchTerm, statusFilter, locationFilter, showFavoritesOnly],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('pageSize', '20');
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);
      if (locationFilter) params.append('location', locationFilter);
      if (showFavoritesOnly) params.append('isFavorite', 'true');
      
      const res = await fetch(`/api/candidates?${params}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch candidates');
      return res.json();
    },
    refetchInterval: false,
  });

  // Upload candidates mutation
  const uploadCandidatesMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('resumes', file);
      });
      
      const res = await fetch('/api/candidates/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!res.ok) {
        const error = await res.text();
        throw new Error(error || res.statusText);
      }
      
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Upload Complete",
        description: `Successfully processed ${data.candidates} candidates`,
      });
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

  // Favorite mutation
  const favoriteMutation = useMutation({
    mutationFn: async ({ id, isFavorite }: { id: number; isFavorite: boolean }) => {
      const res = await apiRequest("POST", `/api/candidates/${id}/favorite`, { isFavorite });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/candidates'] });
    },
  });

  // Update candidate mutation
  const updateCandidateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<Candidate> }) => {
      const res = await apiRequest("PATCH", `/api/candidates/${id}`, updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/candidates'] });
      toast({
        title: "Candidate Updated",
        description: "Candidate information has been updated successfully",
      });
    },
  });

  // Bulk analysis mutation
  const bulkAnalysisMutation = useMutation({
    mutationFn: async (data: z.infer<typeof bulkAnalysisSchema> & { candidateIds: number[] }) => {
      const res = await apiRequest("POST", "/api/analyses/bulk", data);
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Analysis Started",
        description: `Analyzing ${data.candidateCount} candidates. Check the Analytics page for results.`,
      });
      setShowAnalysisDialog(false);
      setSelectedCandidates([]);
      analysisForm.reset();
    },
    onError: (error) => {
      toast({
        title: "Analysis Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (candidateIds: number[]) => {
      const res = await apiRequest("DELETE", "/api/candidates/bulk", { candidateIds });
      return res.json();
    },
    onSuccess: (response) => {
      toast({
        title: "Candidates deleted",
        description: `Successfully deleted ${selectedCandidates.length} candidates.`,
      });
      setSelectedCandidates([]);
      queryClient.invalidateQueries(['/api/candidates']);
    },
    onError: (error) => {
      toast({
        title: "Failed to delete candidates",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      uploadCandidatesMutation.mutate(files);
    }
  };

  const toggleFavorite = (candidate: Candidate) => {
    favoriteMutation.mutate({
      id: candidate.id,
      isFavorite: !candidate.isFavorite
    });
  };

  const toggleCandidateSelection = (candidateId: number) => {
    setSelectedCandidates(prev => 
      prev.includes(candidateId)
        ? prev.filter(id => id !== candidateId)
        : [...prev, candidateId]
    );
  };

  const toggleAllCandidates = () => {
    if (selectedCandidates.length === candidates.length) {
      setSelectedCandidates([]);
    } else {
      setSelectedCandidates(candidates.map(c => c.id));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'hired': return 'bg-green-100 text-green-800';
      case 'interviewing': return 'bg-blue-100 text-blue-800';
      case 'contacted': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleUpdateCandidate = (id: number, updates: Partial<Candidate>) => {
    updateCandidateMutation.mutate({ id, updates });
  };

  const onSubmitAnalysis = (data: z.infer<typeof bulkAnalysisSchema>) => {
    if (data.jobTemplateId) {
      const template = jobTemplates?.find(t => t.id === data.jobTemplateId);
      if (template) {
        data.description = template.description;
      }
    }
    
    bulkAnalysisMutation.mutate({
      ...data,
      candidateIds: selectedCandidates,
    });
  };

  const candidates = candidatesData?.candidates || [];
  const totalCandidates = candidatesData?.total || 0;

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Candidate Database</h1>
            <p className="text-sm text-gray-600 mt-1">
              Manage and search through your talent pool • {totalCandidates.toLocaleString()} candidates
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <input
              type="file"
              multiple
              accept=".pdf,.docx,.txt"
              onChange={handleFileUpload}
              className="hidden"
              id="bulk-upload"
            />
            <Button 
              variant="outline" 
              size="lg"
              onClick={() => document.getElementById('bulk-upload')?.click()}
              disabled={uploadCandidatesMutation.isPending}
              className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
            >
              <Upload className="h-5 w-5 mr-2" />
              {uploadCandidatesMutation.isPending ? "Uploading..." : "Upload Resumes (up to 50)"}
            </Button>
            {selectedCandidates.length > 0 && (
              <div className="flex items-center space-x-3">
                <Button onClick={() => setShowAnalysisDialog(true)}>
                  <Users className="h-4 w-4 mr-2" />
                  Analyze Selected ({selectedCandidates.length})
                </Button>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="destructive" className="ml-8">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Selected ({selectedCandidates.length})
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Delete Selected Candidates</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                      <p className="text-sm text-gray-600">
                        Are you sure you want to permanently delete {selectedCandidates.length} selected candidates? 
                        This action cannot be undone and will remove all associated data including notes, 
                        interview records, and analysis results.
                      </p>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <DialogClose asChild>
                        <Button variant="outline">Cancel</Button>
                      </DialogClose>
                      <Button 
                        variant="destructive" 
                        onClick={() => {
                          bulkDeleteMutation.mutate(selectedCandidates);
                        }}
                        disabled={bulkDeleteMutation.isPending}
                      >
                        {bulkDeleteMutation.isPending ? "Deleting..." : "Delete Permanently"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={selectedCandidates.length === candidates.length && candidates.length > 0}
              onChange={toggleAllCandidates}
              className="rounded"
            />
            <span className="text-sm text-gray-600">
              Select All ({selectedCandidates.length}/{candidates.length})
            </span>
          </div>
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search candidates by name, email, role, or company..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="contacted">Contacted</SelectItem>
              <SelectItem value="interviewing">Interviewing</SelectItem>
              <SelectItem value="hired">Hired</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          <Input
            placeholder="Location"
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="w-40"
          />
          <Button
            variant={showFavoritesOnly ? "default" : "outline"}
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            size="sm"
          >
            <Star className={`h-4 w-4 mr-2 ${showFavoritesOnly ? 'fill-current' : ''}`} />
            Favorites
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="grid" className="h-full flex flex-col">
          <div className="px-6 py-2 border-b border-gray-200">
            <TabsList>
              <TabsTrigger value="grid">Grid View</TabsTrigger>
              <TabsTrigger value="table">Table View</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="grid" className="flex-1 overflow-auto p-6">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-6">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {candidates.map((candidate) => (
                  <Card 
                    key={candidate.id} 
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedCandidates.includes(candidate.id) ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => setSelectedCandidateId(candidate.id)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <h3 className="font-semibold text-gray-900">{candidate.name}</h3>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite(candidate);
                              }}
                              className="h-6 w-6 p-0"
                            >
                              <Star 
                                className={`h-4 w-4 ${
                                  candidate.isFavorite 
                                    ? 'fill-yellow-400 text-yellow-400' 
                                    : 'text-gray-400'
                                }`} 
                              />
                            </Button>
                          </div>
                          <Badge className={getStatusColor(candidate.status || 'new')}>
                            {candidate.status || 'new'}
                          </Badge>
                        </div>
                        <input
                          type="checkbox"
                          checked={selectedCandidates.includes(candidate.id)}
                          onChange={(e) => {
                            e.stopPropagation();
                            toggleCandidateSelection(candidate.id);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="rounded"
                        />
                      </div>

                      <div className="space-y-2 text-sm text-gray-600">
                        {candidate.currentRole && (
                          <div className="flex items-center">
                            <Briefcase className="h-4 w-4 mr-2 text-gray-400" />
                            <span>{candidate.currentRole}</span>
                          </div>
                        )}
                        {candidate.currentCompany && (
                          <div className="text-sm text-gray-500 ml-6">
                            at {candidate.currentCompany}
                          </div>
                        )}
                        {candidate.location && (
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                            <span>{candidate.location}</span>
                          </div>
                        )}
                        {candidate.email && (
                          <div className="flex items-center">
                            <Mail className="h-4 w-4 mr-2 text-gray-400" />
                            <span className="truncate">{candidate.email}</span>
                          </div>
                        )}
                        {candidate.experience && (
                          <div className="text-sm text-gray-500">
                            {candidate.experience} years experience
                          </div>
                        )}
                      </div>

                      {candidate.skills && (
                        <div className="mt-4">
                          <div className="flex flex-wrap gap-1">
                            {(candidate.skills as string[]).slice(0, 3).map((skill, index) => (
                              <Badge key={index} variant="secondary" className="text-xs">
                                {skill}
                              </Badge>
                            ))}
                            {(candidate.skills as string[]).length > 3 && (
                              <Badge variant="secondary" className="text-xs">
                                +{(candidate.skills as string[]).length - 3} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="table" className="flex-1 overflow-auto">
            <div className="bg-white">
              <table className="min-w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <input
                        type="checkbox"
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedCandidates(candidates.map(c => c.id));
                          } else {
                            setSelectedCandidates([]);
                          }
                        }}
                        className="rounded"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Candidate
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role & Company
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {candidates.map((candidate) => (
                    <tr key={candidate.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedCandidates.includes(candidate.id)}
                          onChange={() => toggleCandidateSelection(candidate.id)}
                          className="rounded"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div>
                            <div className="flex items-center space-x-2">
                              <div className="text-sm font-medium text-gray-900">
                                {candidate.name}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleFavorite(candidate)}
                                className="h-6 w-6 p-0"
                              >
                                <Star 
                                  className={`h-4 w-4 ${
                                    candidate.isFavorite 
                                      ? 'fill-yellow-400 text-yellow-400' 
                                      : 'text-gray-400'
                                  }`} 
                                />
                              </Button>
                            </div>
                            <div className="text-sm text-gray-500">{candidate.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{candidate.currentRole}</div>
                        <div className="text-sm text-gray-500">{candidate.currentCompany}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {candidate.location}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge className={getStatusColor(candidate.status || 'new')}>
                          {candidate.status || 'new'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setSelectedCandidate(candidate)}
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Pagination */}
      {candidatesData && candidatesData.totalPages > 1 && (
        <div className="bg-white border-t border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {((page - 1) * 20) + 1} to {Math.min(page * 20, totalCandidates)} of {totalCandidates} candidates
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                onClick={() => setPage(p => p + 1)}
                disabled={page >= candidatesData.totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Candidate Detail Modal */}
      <CandidateDetailModal
        candidateId={selectedCandidateId}
        isOpen={!!selectedCandidateId}
        onClose={() => setSelectedCandidateId(null)}
        onCandidateDeleted={() => {
          setSelectedCandidateId(null);
          queryClient.invalidateQueries(['/api/candidates']);
        }}
      />

      {/* Bulk Analysis Dialog */}
      <Dialog open={showAnalysisDialog} onOpenChange={setShowAnalysisDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Analyze {selectedCandidates.length} Candidates</DialogTitle>
          </DialogHeader>
          <Form {...analysisForm}>
            <form onSubmit={analysisForm.handleSubmit(onSubmitAnalysis)} className="space-y-4">
              <FormField
                control={analysisForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Analysis Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Senior Engineers Q1 2025" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={analysisForm.control}
                name="jobTemplateId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Template (Optional)</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value ? parseInt(value) : undefined);
                          if (value) {
                            const template = jobTemplates?.find(t => t.id === parseInt(value));
                            if (template) {
                              analysisForm.setValue('description', template.description);
                            }
                          }
                        }}
                        value={field.value?.toString()}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a job template" />
                        </SelectTrigger>
                        <SelectContent>
                          {jobTemplates?.map((template) => (
                            <SelectItem key={template.id} value={template.id.toString()}>
                              {template.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={analysisForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter the job requirements and description..."
                        className="min-h-[200px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex gap-3 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAnalysisDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={bulkAnalysisMutation.isPending}
                >
                  {bulkAnalysisMutation.isPending ? "Starting Analysis..." : "Start Analysis"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}