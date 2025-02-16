/*
  # Game Database Schema

  1. New Tables
    - `rooms`
      - `id` (uuid, primary key)
      - `code` (text, unique)
      - `created_at` (timestamp)
      - `is_active` (boolean)
      - `score` (integer)
      - `round` (integer)
      
    - `players`
      - `id` (uuid, primary key)
      - `room_id` (uuid, foreign key)
      - `user_id` (uuid, foreign key)
      - `name` (text)
      - `created_at` (timestamp)
      
    - `answers`
      - `id` (uuid, primary key)
      - `room_id` (uuid, foreign key)
      - `player_id` (uuid, foreign key)
      - `question` (text)
      - `answer` (text)
      - `round` (integer)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create rooms table
CREATE TABLE IF NOT EXISTS rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,
  score integer DEFAULT 0,
  round integer DEFAULT 1
);

-- Create players table
CREATE TABLE IF NOT EXISTS players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES rooms(id),
  user_id uuid REFERENCES auth.users(id),
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create answers table
CREATE TABLE IF NOT EXISTS answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid REFERENCES rooms(id),
  player_id uuid REFERENCES players(id),
  question text NOT NULL,
  answer text NOT NULL,
  round integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can create a room"
  ON rooms FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Players can view their rooms"
  ON rooms FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT room_id 
      FROM players 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Players can update their rooms"
  ON rooms FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT room_id 
      FROM players 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Players can create player entries"
  ON players FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Players can view their room's players"
  ON players FOR SELECT
  TO authenticated
  USING (
    room_id IN (
      SELECT room_id 
      FROM players 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Players can submit answers"
  ON answers FOR INSERT
  TO authenticated
  WITH CHECK (
    player_id IN (
      SELECT id 
      FROM players 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Players can view their room's answers"
  ON answers FOR SELECT
  TO authenticated
  USING (
    room_id IN (
      SELECT room_id 
      FROM players 
      WHERE user_id = auth.uid()
    )
  );