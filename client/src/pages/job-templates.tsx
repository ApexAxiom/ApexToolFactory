import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertJobTemplateSchema } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { 
  Search, 
  Plus, 
  Briefcase, 
  MapPin,
  DollarSign,
  Building,
  Clock,
  Star,
  Edit,
  Copy,
  Archive,
  Trash2
} from "lucide-react";
import type { JobTemplate, JobTemplateSearchResult } from "@shared/schema";
import { z } from "zod";

const formSchema = insertJobTemplateSchema.extend({
  requirements: z.union([z.string(), z.array(z.string())]).optional(),
  skills: z.union([z.string(), z.array(z.string())]).optional(),
  tags: z.union([z.string(), z.array(z.string())]).optional(),
});

export default function JobTemplates() {
  const [searchTerm, setSearchTerm] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [page, setPage] = useState(1);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { toast } = useToast();

  // Query for job templates
  const { data: templatesData, isLoading } = useQuery<JobTemplateSearchResult>({
    queryKey: ['/api/job-templates', page, searchTerm, departmentFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('pageSize', '20');
      if (searchTerm) params.append('search', searchTerm);
      if (departmentFilter && departmentFilter !== 'all') params.append('department', departmentFilter);
      
      const res = await fetch(`/api/job-templates?${params}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch job templates');
      return res.json();
    },
  });

  // Form for creating/editing templates
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
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
    mutationFn: async (data: z.infer<typeof formSchema>) => {
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
        description: "Job template has been created successfully",
      });
      setIsCreateDialogOpen(false);
      form.reset();
      // Invalidate both the templates list and the active templates dropdown
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

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    createTemplateMutation.mutate(data);
  };

  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/job-templates/${id}`);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Template Deleted",
        description: "Job template has been deleted successfully",
      });
      // Invalidate both the templates list and the active templates dropdown
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

  const getLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'junior': return 'bg-green-100 text-green-800';
      case 'mid': return 'bg-blue-100 text-blue-800';
      case 'senior': return 'bg-purple-100 text-purple-800';
      case 'lead': return 'bg-orange-100 text-orange-800';
      case 'director': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRemoteTypeIcon = (type: string) => {
    switch (type) {
      case 'Remote': return '🏠';
      case 'Hybrid': return '🏢';
      case 'On-site': return '🏛️';
      default: return '📍';
    }
  };

  const templates = templatesData?.templates || [];
  const totalTemplates = templatesData?.total || 0;

  const departments = Array.from(new Set(templates.map(t => t.department))).filter(Boolean);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Job Templates</h1>
            <p className="text-sm text-gray-600 mt-1">
              Manage reusable job descriptions and requirements • {totalTemplates.toLocaleString()} templates
            </p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Job Template</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
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
                      control={form.control}
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
                      control={form.control}
                      name="level"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Level</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Location</FormLabel>
                          <FormControl>
                            <Input placeholder="San Francisco, CA" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="remoteType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Remote Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select type" />
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
                    control={form.control}
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
                    control={form.control}
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

                  <FormField
                    control={form.control}
                    name="requirements"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Requirements (comma-separated)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="5+ years experience, Bachelor's degree, React expertise..."
                            {...field} 
                            value={Array.isArray(field.value) ? field.value.join(', ') : field.value}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="skills"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Required Skills (comma-separated)</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="React, Node.js, TypeScript, AWS..."
                            {...field} 
                            value={Array.isArray(field.value) ? field.value.join(', ') : field.value}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
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
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsCreateDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createTemplateMutation.isPending}>
                      {createTemplateMutation.isPending ? "Creating..." : "Create Template"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search job templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map(dept => (
                <SelectItem key={dept} value={dept}>{dept}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-200 rounded"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => (
              <Card key={template.id} className="cursor-pointer transition-all hover:shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2">{template.title}</CardTitle>
                      <div className="flex items-center space-x-2 mb-2">
                        <Badge className={getLevelColor(template.level)}>
                          {template.level}
                        </Badge>
                        <Badge variant="outline">
                          <Building className="h-3 w-3 mr-1" />
                          {template.department}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex flex-col space-y-1">
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <Star className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500 hover:text-red-700">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Delete Job Template</DialogTitle>
                          </DialogHeader>
                          <div className="py-4">
                            <p className="text-sm text-gray-600">
                              Are you sure you want to delete the job template "{template.title}"? 
                              This action cannot be undone and will remove the template from all dropdowns and analysis options.
                            </p>
                          </div>
                          <div className="flex justify-end space-x-2">
                            <DialogClose asChild>
                              <Button variant="outline">Cancel</Button>
                            </DialogClose>
                            <Button 
                              variant="destructive" 
                              onClick={() => deleteTemplateMutation.mutate(template.id)}
                              disabled={deleteTemplateMutation.isPending}
                            >
                              {deleteTemplateMutation.isPending ? "Deleting..." : "Delete Template"}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center text-gray-600">
                      <span className="mr-2">{getRemoteTypeIcon(template.remoteType || '')}</span>
                      <span>{template.remoteType}</span>
                      {template.location && (
                        <>
                          <span className="mx-2">•</span>
                          <MapPin className="h-3 w-3 mr-1" />
                          <span>{template.location}</span>
                        </>
                      )}
                    </div>

                    {template.salaryRange && (
                      <div className="flex items-center text-gray-600">
                        <DollarSign className="h-3 w-3 mr-1" />
                        <span>{template.salaryRange}</span>
                      </div>
                    )}

                    {template.description && (
                      <p className="text-gray-600 line-clamp-3">
                        {template.description.substring(0, 150)}
                        {template.description.length > 150 && '...'}
                      </p>
                    )}

                    {template.skills && (template.skills as string[]).length > 0 && (
                      <div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {(template.skills as string[]).slice(0, 4).map((skill, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                          {(template.skills as string[]).length > 4 && (
                            <Badge variant="secondary" className="text-xs">
                              +{(template.skills as string[]).length - 4} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 mt-4 border-t border-gray-100">
                      <div className="flex items-center text-xs text-gray-500">
                        <Clock className="h-3 w-3 mr-1" />
                        {new Date(template.updatedAt).toLocaleDateString()}
                      </div>
                      <div className="flex space-x-1">
                        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                          <Copy className="h-3 w-3 mr-1" />
                          Use
                        </Button>
                        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                          View
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {templates.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No job templates found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || departmentFilter 
                ? "No templates match your current filters"
                : "Get started by creating your first job template"
              }
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </div>
        )}
      </div>

      {/* Pagination */}
      {templatesData && templatesData.totalPages > 1 && (
        <div className="bg-white border-t border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {((page - 1) * 20) + 1} to {Math.min(page * 20, totalTemplates)} of {totalTemplates} templates
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
                disabled={page >= templatesData.totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}