-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  age INTEGER NOT NULL,
  gender VARCHAR(10) NOT NULL,
  weight DECIMAL(5,2) NOT NULL,
  height DECIMAL(5,2) NOT NULL,
  activity_level VARCHAR(20) NOT NULL,
  dietary_restrictions TEXT[] DEFAULT '{}',
  weekly_budget DECIMAL(10,2) NOT NULL,
  bmr DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add RLS policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (for now, we'll add auth later)
CREATE POLICY "Allow public insert" ON profiles
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Allow anyone to read (for now, we'll add auth later)
CREATE POLICY "Allow public read" ON profiles
  FOR SELECT
  TO public
  USING (true); 