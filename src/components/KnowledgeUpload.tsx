
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { Upload, File, X, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface KnowledgeUploadProps {
  onSuccess: () => void;
}

export function KnowledgeUpload({ onSuccess }: KnowledgeUploadProps) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'DOCUMENT' as const,
    tags: [] as string[],
    isPublic: false
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [tagInput, setTagInput] = useState('');
  const [uploading, setUploading] = useState(false);
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
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast({
        title: "Erro",
        description: "Título é obrigatório",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Erro",
        description: "Usuário não autenticado",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      let filePath = null;
      let fileName = null;
      let fileSize = null;
      let fileType = null;

      // Upload file if selected
      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        filePath = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('knowledge-files')
          .upload(filePath, selectedFile);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          toast({
            title: "Erro no upload",
            description: uploadError.message,
            variant: "destructive",
          });
          return;
        }

        fileName = selectedFile.name;
        fileSize = selectedFile.size;
        fileType = selectedFile.type;
      }

      // Create knowledge base record
      const { error: insertError } = await supabase
        .from('knowledge_bases')
        .insert({
          title: formData.title,
          description: formData.description || null,
          type: formData.type,
          file_path: filePath,
          file_name: fileName,
          file_size: fileSize,
          file_type: fileType,
          tags: formData.tags.length > 0 ? formData.tags : null,
          created_by: user.id,
          is_public: formData.isPublic
        });

      if (insertError) {
        console.error('Insert error:', insertError);
        toast({
          title: "Erro",
          description: insertError.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Sucesso",
        description: "Base de conhecimento criada com sucesso",
      });

      onSuccess();
    } catch (error) {
      console.error('Error creating knowledge base:', error);
      toast({
        title: "Erro",
        description: "Erro inesperado ao criar base de conhecimento",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* File Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive 
            ? 'border-green-500 bg-green-500/10' 
            : 'border-zinc-700 hover:border-zinc-600'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        {selectedFile ? (
          <div className="space-y-2">
            <File className="w-12 h-12 text-green-500 mx-auto" />
            <div className="text-umind-gray font-medium">{selectedFile.name}</div>
            <div className="text-umind-gray/70 text-sm">
              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSelectedFile(null)}
              className="border-zinc-600 text-umind-gray"
            >
              <X className="w-4 h-4 mr-2" />
              Remover
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <Upload className="w-12 h-12 text-umind-gray/50 mx-auto" />
            <div>
              <div className="text-umind-gray font-medium mb-2">
                Arraste um arquivo ou clique para selecionar
              </div>
              <div className="text-umind-gray/70 text-sm mb-4">
                PDF, DOC, DOCX, TXT, MD, JPG, PNG, GIF (máx. 50MB)
              </div>
              <input
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.txt,.md,.jpg,.jpeg,.png,.gif"
                className="hidden"
                id="file-upload"
              />
              <Button
                type="button"
                variant="outline"
                className="border-zinc-600 text-umind-gray"
                onClick={() => document.getElementById('file-upload')?.click()}
              >
                Selecionar Arquivo
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Form Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-umind-gray">Título *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="bg-zinc-800 border-zinc-700 text-umind-gray"
              placeholder="Nome da base de conhecimento"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type" className="text-umind-gray">Tipo</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => setFormData(prev => ({ ...prev, type: value as any }))}
            >
              <SelectTrigger className="bg-zinc-800 border-zinc-700 text-umind-gray">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-zinc-700">
                <SelectItem value="DOCUMENT">Documento</SelectItem>
                <SelectItem value="FAQ">FAQ</SelectItem>
                <SelectItem value="MANUAL">Manual</SelectItem>
                <SelectItem value="TRAINING">Treinamento</SelectItem>
                <SelectItem value="REFERENCE">Referência</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-umind-gray">Tags</Label>
            <div className="flex space-x-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                className="bg-zinc-800 border-zinc-700 text-umind-gray"
                placeholder="Adicionar tag"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addTag}
                className="border-zinc-600 text-umind-gray"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-1 hover:text-red-400"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="description" className="text-umind-gray">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="bg-zinc-800 border-zinc-700 text-umind-gray h-24"
              placeholder="Descreva o conteúdo desta base de conhecimento"
            />
          </div>

          <Card className="bg-zinc-800 border-zinc-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-umind-gray font-medium">Acesso Público</Label>
                <p className="text-umind-gray/70 text-sm mt-1">
                  Disponível para todos os usuários
                </p>
              </div>
              <Switch
                checked={formData.isPublic}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isPublic: checked }))}
              />
            </div>
          </Card>
        </div>
      </div>

      <div className="flex justify-end space-x-4 pt-4">
        <Button
          type="submit"
          disabled={uploading}
          className="bg-green-600 hover:bg-green-700"
        >
          {uploading ? 'Criando...' : 'Criar Base de Conhecimento'}
        </Button>
      </div>
    </form>
  );
}
