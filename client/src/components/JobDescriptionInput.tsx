import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CloudUpload, FileText } from "lucide-react";

interface JobDescriptionInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export default function JobDescriptionInput({ value, onChange, disabled }: JobDescriptionInputProps) {
  const [dragActive, setDragActive] = useState(false);

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

    const files = Array.from(e.dataTransfer.files);
    const file = files[0];
    
    if (file && (file.type === "application/pdf" || file.name.endsWith('.docx'))) {
      // In a real implementation, you would extract text from the file
      const reader = new FileReader();
      reader.onload = (event) => {
        // This is a placeholder - in production you'd send to backend for extraction
        onChange(`[Job description extracted from ${file.name}]\n\nThis would contain the actual extracted text from the uploaded file.`);
      };
      reader.readAsText(file);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Same as handleDrop - would extract text in production
      onChange(`[Job description extracted from ${file.name}]\n\nThis would contain the actual extracted text from the uploaded file.`);
    }
  };

  return (
    <Tabs defaultValue="upload" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="upload">Upload File</TabsTrigger>
        <TabsTrigger value="text">Paste Text</TabsTrigger>
      </TabsList>
      
      <TabsContent value="upload" className="mt-4">
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
            dragActive 
              ? 'border-primary bg-primary/5' 
              : 'border-gray-300 hover:border-primary/50'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => !disabled && document.getElementById('job-file-input')?.click()}
        >
          <CloudUpload className="h-8 w-8 text-gray-400 mx-auto mb-3" />
          <p className="text-sm text-gray-600 mb-2">Drop job description here or click to browse</p>
          <p className="text-xs text-gray-500">PDF, DOCX files supported</p>
          <input
            id="job-file-input"
            type="file"
            className="hidden"
            accept=".pdf,.docx"
            onChange={handleFileInput}
            disabled={disabled}
          />
        </div>
      </TabsContent>
      
      <TabsContent value="text" className="mt-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Job Description</label>
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Paste the job description here..."
            className="min-h-[120px] resize-none"
            disabled={disabled}
          />
        </div>
      </TabsContent>
    </Tabs>
  );
}
