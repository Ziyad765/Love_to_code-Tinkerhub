/*
  # Fix RLS Policies for Game Tables

  1. Changes
    - Update RLS policies to allow unauthenticated access
    - Add public access for room creation and viewing
    - Simplify player and answer policies
    
  2. Security
    - Maintain basic security while allowing game functionality
    - Enable public access for game rooms
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can create a room" ON rooms;
DROP POLICY IF EXISTS "Players can view their rooms" ON rooms;
DROP POLICY IF EXISTS "Players can update their rooms" ON rooms;
DROP POLICY IF EXISTS "Players can create player entries" ON players;
DROP POLICY IF EXISTS "Players can view their room's players" ON players;
DROP POLICY IF EXISTS "Players can submit answers" ON answers;
DROP POLICY IF EXISTS "Players can view their room's answers" ON answers;

-- Create new policies for rooms
CREATE POLICY "Enable read access for all users"
  ON rooms FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Enable insert access for all users"
  ON rooms FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Enable update access for all users"
  ON rooms FOR UPDATE
  TO public
  USING (true);

-- Create new policies for players
CREATE POLICY "Enable read access for players"
  ON players FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Enable insert access for players"
  ON players FOR INSERT
  TO public
  WITH CHECK (true);

-- Create new policies for answers
CREATE POLICY "Enable read access for answers"
  ON answers FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Enable insert access for answers"
  ON answers FOR INSERT
  TO public
  WITH CHECK (true);