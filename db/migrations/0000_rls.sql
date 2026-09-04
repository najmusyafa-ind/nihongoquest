-- db/migrations/0000_rls.sql
-- Mengaktifkan Row Level Security (RLS) di Supabase

-- 1. Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_explanation_cache ENABLE ROW LEVEL SECURITY;

-- 2. Kebijakan untuk tabel "profiles"
-- Pengguna hanya dapat membaca dan memperbarui profil mereka sendiri.
CREATE POLICY "Users can view own profile" 
ON profiles FOR SELECT 
USING ( auth.uid() = id );

CREATE POLICY "Users can update own profile" 
ON profiles FOR UPDATE 
USING ( auth.uid() = id );

CREATE POLICY "Users can insert own profile" 
ON profiles FOR INSERT 
WITH CHECK ( auth.uid() = id );

-- 3. Kebijakan untuk tabel "study_sessions"
-- Pengguna hanya bisa baca dan nambah sesi belajar mereka sendiri (APPEND-ONLY)
CREATE POLICY "Users can view own sessions" 
ON study_sessions FOR SELECT 
USING ( auth.uid() = user_id );

CREATE POLICY "Users can insert own sessions" 
ON study_sessions FOR INSERT 
WITH CHECK ( auth.uid() = user_id );

-- 4. Kebijakan untuk tabel "study_results"
CREATE POLICY "Users can view own results" 
ON study_results FOR SELECT 
USING ( auth.uid() = user_id );

CREATE POLICY "Users can insert own results" 
ON study_results FOR INSERT 
WITH CHECK ( auth.uid() = user_id );

-- 5. Kebijakan untuk tabel "flashcards" (READ-ONLY untuk semua yang login)
CREATE POLICY "Authenticated users can read flashcards" 
ON flashcards FOR SELECT 
TO authenticated 
USING ( true );

-- 6. Kebijakan untuk tabel "ai_explanation_cache" (READ-ONLY untuk semua yang login)
CREATE POLICY "Authenticated users can read AI cache" 
ON ai_explanation_cache FOR SELECT 
TO authenticated 
USING ( true );
