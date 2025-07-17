import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Star, Mail, Phone, MapPin, Briefcase, Calendar, FileText, X, Save, Trash2, Edit3, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Candidate } from "@shared/schema";

interface CandidateDetailModalProps {
  candidateId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onCandidateDeleted?: () => void;
}

export function CandidateDetailModal({ candidateId, isOpen, onClose, onCandidateDeleted }: CandidateDetailModalProps) {
  const [showFullResume, setShowFullResume] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState("");
  const { toast } = useToast();

  const { data: candidate, isLoading } = useQuery<Candidate>({
    queryKey: ['/api/candidates', candidateId],
    enabled: !!candidateId && isOpen,
    queryFn: async () => {
      if (!candidateId) return null;
      const res = await fetch(`/api/candidates/${candidateId}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch candidate');
      return res.json();
    },
    onSuccess: (data) => {
      if (data?.notes) {
        setNotesValue(data.notes);
      }
    }
  });

  // Update notes mutation
  const updateNotesMutation = useMutation({
    mutationFn: async (notes: string) => {
      if (!candidateId) throw new Error('No candidate ID');
      return apiRequest('PATCH', `/api/candidates/${candidateId}`, { notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['/api/candidates', candidateId]);
      queryClient.invalidateQueries(['/api/candidates']);
      setIsEditingNotes(false);
      toast({
        title: "Notes updated",
        description: "Candidate notes have been saved successfully."
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update notes",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    }
  });

  // Delete candidate mutation
  const deleteCandidateMutation = useMutation({
    mutationFn: async () => {
      if (!candidateId) throw new Error('No candidate ID');
      return apiRequest('DELETE', `/api/candidates/${candidateId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['/api/candidates']);
      toast({
        title: "Candidate deleted",
        description: "The candidate has been permanently removed from the database."
      });
      onClose();
      onCandidateDeleted?.();
    },
    onError: (error) => {
      toast({
        title: "Failed to delete candidate",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    }
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      if (!candidateId) throw new Error('No candidate ID');
      return apiRequest('PATCH', `/api/candidates/${candidateId}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['/api/candidates', candidateId]);
      queryClient.invalidateQueries(['/api/candidates']);
      toast({
        title: "Status updated",
        description: "Candidate status has been updated successfully."
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to update status",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    }
  });

  const handleSaveNotes = () => {
    updateNotesMutation.mutate(notesValue);
  };

  const handleDeleteCandidate = () => {
    deleteCandidateMutation.mutate();
  };

  const handleStatusChange = (newStatus: string) => {
    updateStatusMutation.mutate(newStatus);
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Candidate Profile</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-6">
            <div className="flex items-center space-x-4">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
            <Skeleton className="h-40" />
          </div>
        ) : candidate ? (
          <ScrollArea className="max-h-[80vh]">
            <div className="space-y-6 pr-4">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-4">
                  <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="text-xl font-semibold text-primary">
                      {candidate.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{candidate.name}</h2>
                    <div className="flex items-center space-x-4 mt-1">
                      {candidate.email && (
                        <div className="flex items-center text-gray-600">
                          <Mail className="h-4 w-4 mr-1" />
                          <span className="text-sm">{candidate.email}</span>
                        </div>
                      )}
                      {candidate.phone && (
                        <div className="flex items-center text-gray-600">
                          <Phone className="h-4 w-4 mr-1" />
                          <span className="text-sm">{candidate.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  {candidate.isFavorite && (
                    <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  )}
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-600">Status:</span>
                    <Select 
                      value={candidate.status || 'new'} 
                      onValueChange={handleStatusChange}
                      disabled={updateStatusMutation.isPending}
                    >
                      <SelectTrigger className="w-[130px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="contacted">Contacted</SelectItem>
                        <SelectItem value="interviewing">Interviewing</SelectItem>
                        <SelectItem value="hired">Hired</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Key Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {candidate.location && (
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center">
                        <MapPin className="h-5 w-5 text-gray-400 mr-3" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Location</p>
                          <p className="text-sm text-gray-600">{candidate.location}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {candidate.experience && (
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center">
                        <Briefcase className="h-5 w-5 text-gray-400 mr-3" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Experience</p>
                          <p className="text-sm text-gray-600">{candidate.experience}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {candidate.resumeFilename && (
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <FileText className="h-5 w-5 text-gray-400 mr-3" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">Resume File</p>
                            <p className="text-sm text-gray-600">{candidate.resumeFilename}</p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            window.open(`/api/candidates/${candidate.id}/resume`, '_blank');
                          }}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Skills */}
              {candidate.skills && candidate.skills.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Skills</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {candidate.skills.map((skill, index) => (
                        <Badge key={index} variant="outline">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Notes Section */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center">
                      <Edit3 className="h-5 w-5 mr-2" />
                      Recruiter Notes
                    </CardTitle>
                    {isEditingNotes ? (
                      <div className="flex items-center space-x-2">
                        <Button 
                          onClick={handleSaveNotes} 
                          size="sm" 
                          disabled={updateNotesMutation.isPending}
                        >
                          <Save className="h-4 w-4 mr-1" />
                          {updateNotesMutation.isPending ? "Saving..." : "Save"}
                        </Button>
                        <Button 
                          onClick={() => {
                            setIsEditingNotes(false);
                            setNotesValue(candidate.notes || "");
                          }} 
                          variant="outline" 
                          size="sm"
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button 
                        onClick={() => setIsEditingNotes(true)} 
                        variant="outline" 
                        size="sm"
                      >
                        <Edit3 className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {isEditingNotes ? (
                    <Textarea
                      value={notesValue}
                      onChange={(e) => setNotesValue(e.target.value)}
                      placeholder="Add notes about this candidate (interview feedback, observations, next steps, etc.)"
                      className="min-h-[120px] resize-none"
                    />
                  ) : (
                    <div className="min-h-[120px] p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
                      {candidate.notes ? (
                        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                          {candidate.notes}
                        </p>
                      ) : (
                        <p className="text-sm text-gray-500 italic">
                          No notes added yet. Click Edit to add your observations about this candidate.
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Resume Content */}
              {candidate.resumeText && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center justify-between">
                      Resume Content
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowFullResume(!showFullResume)}
                      >
                        {showFullResume ? 'Show Less' : 'Show Full Resume'}
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono">
                        {showFullResume 
                          ? candidate.resumeText
                          : candidate.resumeText.slice(0, 500) + (candidate.resumeText.length > 500 ? '...' : '')
                        }
                      </pre>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* AI Profile Summary */}
              {candidate.summary && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">AI Profile Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                        {candidate.summary}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Metadata */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Profile Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-900">Source:</span>
                      <span className="ml-2 text-gray-600">{candidate.source || 'Unknown'}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-900">Added:</span>
                      <span className="ml-2 text-gray-600">
                        {candidate.createdAt ? new Date(candidate.createdAt).toLocaleDateString() : 'Unknown'}
                      </span>
                    </div>
                    {candidate.lastUpdated && (
                      <div>
                        <span className="font-medium text-gray-900">Last Updated:</span>
                        <span className="ml-2 text-gray-600">
                          {new Date(candidate.lastUpdated).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Delete Button - Moved to Bottom */}
              <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      className="w-full"
                      disabled={deleteCandidateMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {deleteCandidateMutation.isPending ? "Deleting..." : "Delete Candidate"}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Candidate?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently remove {candidate.name} from your candidate database. 
                        This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={handleDeleteCandidate}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Delete Permanently
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </ScrollArea>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500">Candidate not found</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}