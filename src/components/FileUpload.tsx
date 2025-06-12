
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Paperclip, X, FileIcon } from "lucide-react";

interface FileUploadProps {
  onFileSelect: (files: File[]) => void;
  selectedFiles: File[];
  onRemoveFile: (index: number) => void;
}

const FileUpload = ({ onFileSelect, selectedFiles, onRemoveFile }: FileUploadProps) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleFiles(files);
  };

  const handleFiles = (files: File[]) => {
    const validFiles = files.filter(file => {
      const maxSize = 50 * 1024 * 1024; // 50MB
      if (file.size > maxSize) {
        toast({
          title: "Arquivo muito grande",
          description: `${file.name} excede o limite de 50MB`,
          variant: "destructive",
        });
        return false;
      }
      return true;
    });

    if (validFiles.length > 0) {
      onFileSelect([...selectedFiles, ...validFiles]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return '🖼️';
    if (fileType.startsWith('audio/')) return '🎵';
    if (fileType.startsWith('video/')) return '🎥';
    if (fileType.includes('pdf')) return '📄';
    if (fileType.includes('doc')) return '📝';
    if (fileType.includes('sheet') || fileType.includes('excel')) return '📊';
    return '📎';
  };

  return (
    <div className="space-y-2">
      {/* File Input */}
      <div className="flex items-center space-x-2">
        <label htmlFor="file-upload" className="cursor-pointer">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-zinc-700 text-umind-gray hover:bg-zinc-800"
            asChild
          >
            <span>
              <Paperclip className="w-4 h-4 mr-2" />
              Anexar
            </span>
          </Button>
        </label>
        <Input
          id="file-upload"
          type="file"
          multiple
          onChange={handleFileChange}
          className="hidden"
          accept="image/*,audio/*,video/*,.pdf,.doc,.docx,.txt,.csv,.xlsx,.xls"
        />
      </div>

      {/* Drag and Drop Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${
          isDragOver
            ? 'border-umind-gray bg-zinc-800/50'
            : 'border-zinc-700 hover:border-zinc-600'
        }`}
      >
        <p className="text-sm text-umind-gray/60">
          Arraste arquivos aqui ou clique em "Anexar"
        </p>
        <p className="text-xs text-umind-gray/40 mt-1">
          Suporte: imagens, áudios, vídeos, documentos (máx. 50MB)
        </p>
      </div>

      {/* Selected Files */}
      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          {selectedFiles.map((file, index) => (
            <Card key={index} className="bg-zinc-800 border-zinc-700">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-lg">{getFileIcon(file.type)}</span>
                    <div>
                      <p className="text-sm text-umind-gray font-medium">{file.name}</p>
                      <p className="text-xs text-umind-gray/60">{formatFileSize(file.size)}</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onRemoveFile(index)}
                    className="text-umind-gray/60 hover:text-red-400"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileUpload;
