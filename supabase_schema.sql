-- Habilitar extensión para UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabla: targets (URLs o IPs a auditar)
CREATE TABLE public.targets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabla: scans (Historial de auditorías)
CREATE TYPE scan_status AS ENUM ('pending', 'in_progress', 'completed', 'failed');

CREATE TABLE public.scans (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    target_id UUID NOT NULL REFERENCES public.targets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status scan_status DEFAULT 'pending' NOT NULL,
    pdf_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- 3. Tabla: iso_controls (Catálogo de controles de ISO 27001)
CREATE TABLE public.iso_controls (
    id VARCHAR(50) PRIMARY KEY, -- ej. 'A.10'
    name VARCHAR(255) NOT NULL,
    description TEXT
);

-- 4. Tabla: vulnerabilities (Hallazgos y mapeo ISO 27001)
CREATE TYPE vulnerability_severity AS ENUM ('low', 'medium', 'high', 'critical');

CREATE TABLE public.vulnerabilities (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    scan_id UUID REFERENCES scans(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    severity VARCHAR(50),
    type VARCHAR(100),
    is_false_positive BOOLEAN DEFAULT false,
    iso_27001_control VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================

ALTER TABLE public.targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vulnerabilities ENABLE ROW LEVEL SECURITY;

-- Políticas para targets
CREATE POLICY "Users can view their own targets" 
ON public.targets FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own targets" 
ON public.targets FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own targets" 
ON public.targets FOR DELETE 
USING (auth.uid() = user_id);

-- Políticas para scans
CREATE POLICY "Users can view their own scans" 
ON public.scans FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own scans" 
ON public.scans FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Políticas para vulnerabilities
CREATE POLICY "Users can view vulnerabilities of their scans" 
ON public.vulnerabilities FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.scans 
        WHERE scans.id = vulnerabilities.scan_id 
        AND scans.user_id = auth.uid()
    )
);

CREATE POLICY "Users can update vulnerabilities of their scans" 
ON public.vulnerabilities FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM public.scans 
        WHERE scans.id = vulnerabilities.scan_id 
        AND scans.user_id = auth.uid()
    )
);

-- ==========================================
-- STORAGE (Para los PDFs)
-- ==========================================
-- (Asegúrate de haber creado un bucket llamado 'reports' manualmente en el Dashboard o ejecutar:)
INSERT INTO storage.buckets (id, name, public) VALUES ('reports', 'reports', false) ON CONFLICT DO NOTHING;

CREATE POLICY "Users can view their own reports"
ON storage.objects FOR SELECT
USING (bucket_id = 'reports' AND auth.uid() = owner);
