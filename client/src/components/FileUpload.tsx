import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CloudUpload, FileText, File, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FileUploadProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  disabled?: boolean;
  maxFiles?: number;
}

export default function FileUpload({ files, onFilesChange, disabled, maxFiles = 50 }: FileUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const { toast } = useToast();

  const validateFile = (file: File): boolean => {
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const allowedExtensions = ['.pdf', '.docx'];
    
    const isValidType = allowedTypes.includes(file.type) || 
                       allowedExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
    
    if (!isValidType) {
      toast({
        title: "Invalid File Type",
        description: `${file.name} is not a supported file type. Please upload PDF or DOCX files only.`,
        variant: "destructive",
      });
      return false;
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast({
        title: "File Too Large",
        description: `${file.name} is too large. Maximum file size is 10MB.`,
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleFiles = (newFiles: FileList | File[]) => {
    const fileArray = Array.from(newFiles);
    const validFiles = fileArray.filter(validateFile);
    
    // Check for duplicates
    const uniqueFiles = validFiles.filter(newFile => 
      !files.some(existingFile => existingFile.name === newFile.name)
    );

    if (uniqueFiles.length !== validFiles.length) {
      toast({
        title: "Duplicate Files",
        description: "Some files were already uploaded and have been skipped.",
        variant: "destructive",
      });
    }

    const totalFiles = files.length + uniqueFiles.length;
    if (totalFiles > maxFiles) {
      const allowedCount = maxFiles - files.length;
      const limitedFiles = uniqueFiles.slice(0, allowedCount);
      
      toast({
        title: "File Limit Exceeded",
        description: `Maximum ${maxFiles} files allowed. Only the first ${allowedCount} files were added.`,
        variant: "destructive",
      });
      
      onFilesChange([...files, ...limitedFiles]);
    } else {
      onFilesChange([...files, ...uniqueFiles]);
      
      if (uniqueFiles.length > 0) {
        toast({
          title: "Files Added",
          description: `Successfully added ${uniqueFiles.length} file(s).`,
        });
      }
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (disabled) return;
    
    const droppedFiles = e.dataTransfer.files;
    if (droppedFiles.length > 0) {
      handleFiles(droppedFiles);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (selectedFiles && selectedFiles.length > 0) {
      handleFiles(selectedFiles);
    }
    // Reset input value to allow re-selecting the same file
    e.target.value = '';
  };

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    onFilesChange(newFiles);
  };

  const getFileIcon = (filename: string) => {
    if (filename.toLowerCase().endsWith('.pdf')) {
      return <File className="h-4 w-4 text-red-500" />;
    }
    if (filename.toLowerCase().endsWith('.docx')) {
      return <FileText className="h-4 w-4 text-blue-500" />;
    }
    return <File className="h-4 w-4 text-gray-500" />;
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
          dragActive 
            ? 'border-primary bg-primary/5' 
            : 'border-gray-300 hover:border-primary/50'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !disabled && document.getElementById('resume-file-input')?.click()}
      >
        <CloudUpload className="h-8 w-8 text-gray-400 mx-auto mb-3" />
        <p className="text-sm text-gray-600 mb-2">Drop resumes here or click to browse</p>
        <p className="text-xs text-gray-500">Up to {maxFiles} PDF/DOCX files • Enterprise volume supported</p>
        <input
          id="resume-file-input"
          type="file"
          className="hidden"
          multiple
          accept=".pdf,.docx"
          onChange={handleFileInput}
          disabled={disabled}
        />
      </div>

      {/* Uploaded Files List */}
      {files.length > 0 && (
        <ScrollArea className="h-48 w-full border rounded-lg">
          <div className="p-4 space-y-2">
            {files.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  {getFileIcon(file.name)}
                  <span className="text-sm text-gray-700 truncate max-w-[200px]" title={file.name}>
                    {file.name}
                  </span>
                  <span className="text-xs text-gray-500">
                    ({(file.size / 1024 / 1024).toFixed(1)} MB)
                  </span>
                </div>
                {!disabled && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(index);
                    }}
                    className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
