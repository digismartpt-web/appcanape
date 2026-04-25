-- 🛡️ SCRIPT ISOLÉ : Uniquement pour App Canapé
-- ✅ N'affecte AUCUNE autre table/projet sur cette instance Supabase

CREATE TABLE IF NOT EXISTS appcanape_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  client_phone TEXT,
  reservation_date DATE NOT NULL,
  reservation_time TIME NOT NULL,
  guests INTEGER DEFAULT 1,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE appcanape_reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "appcanape_public_access" 
ON appcanape_reservations 
FOR ALL 
USING (true) 
WITH CHECK (true);
