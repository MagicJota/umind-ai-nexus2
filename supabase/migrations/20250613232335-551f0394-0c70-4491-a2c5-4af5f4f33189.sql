
-- Create enum for knowledge base types
CREATE TYPE public.knowledge_type AS ENUM ('DOCUMENT', 'FAQ', 'MANUAL', 'TRAINING', 'REFERENCE');

-- Create enum for knowledge status
CREATE TYPE public.knowledge_status AS ENUM ('ACTIVE', 'INACTIVE', 'DRAFT', 'ARCHIVED');

-- Create knowledge_bases table
CREATE TABLE public.knowledge_bases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  type public.knowledge_type NOT NULL DEFAULT 'DOCUMENT',
  status public.knowledge_status NOT NULL DEFAULT 'ACTIVE',
  file_path TEXT,
  file_name TEXT,
  file_size BIGINT,
  file_type TEXT,
  content TEXT, -- Extracted text content for search
  tags TEXT[], -- Array of tags for categorization
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  version INTEGER NOT NULL DEFAULT 1,
  is_public BOOLEAN NOT NULL DEFAULT false -- Global access flag
);

-- Create user_knowledge_access table for granular permissions
CREATE TABLE public.user_knowledge_access (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  knowledge_base_id UUID REFERENCES public.knowledge_bases(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  granted_by UUID REFERENCES auth.users(id) NOT NULL,
  granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(knowledge_base_id, user_id)
);

-- Create knowledge_access_logs for audit trail
CREATE TABLE public.knowledge_access_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  knowledge_base_id UUID REFERENCES public.knowledge_bases(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL, -- 'VIEW', 'DOWNLOAD', 'SEARCH'
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create storage bucket for knowledge files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'knowledge-files',
  'knowledge-files',
  false,
  52428800, -- 50MB limit
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'text/markdown', 'image/jpeg', 'image/png', 'image/gif']
);

-- Enable RLS on all tables
ALTER TABLE public.knowledge_bases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_knowledge_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_access_logs ENABLE ROW LEVEL SECURITY;

-- Create helper functions to avoid RLS recursion
CREATE OR REPLACE FUNCTION public.user_has_knowledge_access(kb_id UUID, u_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.knowledge_bases kb
    WHERE kb.id = kb_id 
    AND (
      kb.is_public = true 
      OR kb.created_by = u_id
      OR EXISTS (
        SELECT 1 FROM public.user_knowledge_access uka 
        WHERE uka.knowledge_base_id = kb_id AND uka.user_id = u_id
      )
    )
  )
$$;

CREATE OR REPLACE FUNCTION public.user_can_manage_knowledge(u_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = u_id AND p.role IN ('ADMIN', 'PREMIUM')
  )
$$;

-- RLS Policies for knowledge_bases
CREATE POLICY "Users can view accessible knowledge bases"
  ON public.knowledge_bases
  FOR SELECT
  USING (public.user_has_knowledge_access(id, auth.uid()));

CREATE POLICY "Admins and Premium users can create knowledge bases"
  ON public.knowledge_bases
  FOR INSERT
  WITH CHECK (public.user_can_manage_knowledge(auth.uid()));

CREATE POLICY "Creators and admins can update knowledge bases"
  ON public.knowledge_bases
  FOR UPDATE
  USING (
    created_by = auth.uid() 
    OR public.is_current_user_admin()
  );

CREATE POLICY "Creators and admins can delete knowledge bases"
  ON public.knowledge_bases
  FOR DELETE
  USING (
    created_by = auth.uid() 
    OR public.is_current_user_admin()
  );

-- RLS Policies for user_knowledge_access
CREATE POLICY "Admins and creators can view access grants"
  ON public.user_knowledge_access
  FOR SELECT
  USING (
    public.is_current_user_admin()
    OR EXISTS (
      SELECT 1 FROM public.knowledge_bases kb 
      WHERE kb.id = knowledge_base_id AND kb.created_by = auth.uid()
    )
  );

CREATE POLICY "Admins and creators can grant access"
  ON public.user_knowledge_access
  FOR INSERT
  WITH CHECK (
    public.is_current_user_admin()
    OR EXISTS (
      SELECT 1 FROM public.knowledge_bases kb 
      WHERE kb.id = knowledge_base_id AND kb.created_by = auth.uid()
    )
  );

CREATE POLICY "Admins and creators can revoke access"
  ON public.user_knowledge_access
  FOR DELETE
  USING (
    public.is_current_user_admin()
    OR EXISTS (
      SELECT 1 FROM public.knowledge_bases kb 
      WHERE kb.id = knowledge_base_id AND kb.created_by = auth.uid()
    )
  );

-- RLS Policies for knowledge_access_logs
CREATE POLICY "Users can view their own access logs"
  ON public.knowledge_access_logs
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "System can insert access logs"
  ON public.knowledge_access_logs
  FOR INSERT
  WITH CHECK (true); -- Allow system to log all access

CREATE POLICY "Admins can view all access logs"
  ON public.knowledge_access_logs
  FOR SELECT
  USING (public.is_current_user_admin());

-- Storage policies for knowledge-files bucket
CREATE POLICY "Users can view accessible files"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'knowledge-files'
    AND EXISTS (
      SELECT 1 FROM public.knowledge_bases kb
      WHERE kb.file_path = name
      AND public.user_has_knowledge_access(kb.id, auth.uid())
    )
  );

CREATE POLICY "Admins and Premium users can upload files"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'knowledge-files'
    AND public.user_can_manage_knowledge(auth.uid())
  );

CREATE POLICY "Creators and admins can update files"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'knowledge-files'
    AND (
      public.is_current_user_admin()
      OR EXISTS (
        SELECT 1 FROM public.knowledge_bases kb
        WHERE kb.file_path = name AND kb.created_by = auth.uid()
      )
    )
  );

CREATE POLICY "Creators and admins can delete files"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'knowledge-files'
    AND (
      public.is_current_user_admin()
      OR EXISTS (
        SELECT 1 FROM public.knowledge_bases kb
        WHERE kb.file_path = name AND kb.created_by = auth.uid()
      )
    )
  );

-- Create indexes for better performance
CREATE INDEX idx_knowledge_bases_created_by ON public.knowledge_bases(created_by);
CREATE INDEX idx_knowledge_bases_type ON public.knowledge_bases(type);
CREATE INDEX idx_knowledge_bases_status ON public.knowledge_bases(status);
CREATE INDEX idx_knowledge_bases_tags ON public.knowledge_bases USING GIN(tags);
CREATE INDEX idx_knowledge_bases_content_search ON public.knowledge_bases USING GIN(to_tsvector('portuguese', content));
CREATE INDEX idx_user_knowledge_access_user_id ON public.user_knowledge_access(user_id);
CREATE INDEX idx_user_knowledge_access_knowledge_id ON public.user_knowledge_access(knowledge_base_id);
CREATE INDEX idx_knowledge_access_logs_user_id ON public.knowledge_access_logs(user_id);
CREATE INDEX idx_knowledge_access_logs_knowledge_id ON public.knowledge_access_logs(knowledge_base_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_knowledge_base_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_knowledge_bases_updated_at
  BEFORE UPDATE ON public.knowledge_bases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_knowledge_base_updated_at();
