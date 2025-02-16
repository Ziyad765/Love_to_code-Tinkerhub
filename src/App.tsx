import React, { useState, useEffect } from 'react';
import { Heart, Timer, Trophy } from 'lucide-react';
import { supabase } from './lib/supabase';
import type { GameState } from './types';

function App() {
  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [message, setMessage] = useState('');
  const [roomId, setRoomId] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [playerCount, setPlayerCount] = useState(0); // New state for player count
  const [gameStarted, setGameStarted] = useState(false); // New state for game start

  useEffect(() => {
    const setupGame = async () => {
      if (isJoined && roomId) {
        const roomChannel = supabase.channel(`room:${roomId}`)
          .on('broadcast', { event: 'game_state' }, ({ payload }) => {
            setGameState(payload);
          })
          .on('broadcast', { event: 'message' }, ({ payload }) => {
            setMessage(payload);
          })
          .on('broadcast', { event: 'player_joined' }, ({ payload }) => {
            setPlayerCount(payload.count); // Update player count on join
          })
          .subscribe();

        return () => {
          roomChannel.unsubscribe();
        };
      }
    };

    setupGame();
  }, [isJoined, roomId]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name && roomCode) {
      try {
        // Check if room exists
        let room;
        const { data: existingRoom, error: fetchError } = await supabase
          .from('rooms')
          .select('*')
          .eq('code', roomCode)
          .maybeSingle();

        if (fetchError) throw fetchError;

        if (!existingRoom) {
          // Create new room
          const { data: newRoom, error: createError } = await supabase
            .from('rooms')
            .insert([{ code: roomCode }])
            .select()
            .single();

          if (createError) throw createError;
          room = newRoom;
        } else {
          room = existingRoom;
        }

        // Create player
        const { data: player, error: playerError } = await supabase
          .from('players')
          .insert([{
            room_id: room.id,
            name
          }])
          .select()
          .single();

        if (playerError) throw playerError;

        setRoomId(room.id);
        setPlayerId(player.id);
        setIsJoined(true);
      } catch (error) {
        console.error('Error joining room:', error);
        setMessage('Error joining room. Please try again.');
      }
    }
  };

  const handleStartGame = () => {
    setGameStarted(true);
    // Logic to start the game and ask questions
  };

  const handleSubmitAnswer = async () => {
    if (currentAnswer.trim() && gameState && roomId && playerId) {
      try {
        const { error } = await supabase
          .from('answers')
          .insert([{
            room_id: roomId,
            player_id: playerId,
            question: gameState.currentQuestion,
            answer: currentAnswer,
            round: gameState.round
          }]);

        if (error) throw error;
        setCurrentAnswer('');
      } catch (error) {
        console.error('Error submitting answer:', error);
        setMessage('Error submitting answer. Please try again.');
      }
    }
  };

  if (!isJoined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full">
          <div className="flex justify-center mb-6">
            <Heart className="w-12 h-12 text-pink-500" />
          </div>
          <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">Couples Quiz</h1>
          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Your Name
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring focus:ring-pink-200 p-2"
                required
              />
            </div>
            <div>
              <label htmlFor="roomCode" className="block text-sm font-medium text-gray-700">
                Room Code
              </label>
              <input
                type="text"
                id="roomCode"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring focus:ring-pink-200 p-2"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-pink-500 text-white py-2 px-4 rounded-md hover:bg-pink-600 transition duration-200"
            >
              Join Room
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 to-purple-100 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-6 mb-4">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center">
              <Trophy className="w-6 h-6 text-yellow-500 mr-2" />
              <span className="font-bold text-lg">Score: {gameState?.score || 0}</span>
            </div>
            <div className="flex items-center">
              <Timer className="w-6 h-6 text-blue-500 mr-2" />
              <span className="font-bold text-lg">{gameState?.timeRemaining || 0}s</span>
            </div>
          </div>
          
          {message && (
            <div className="bg-pink-100 text-pink-800 p-4 rounded-lg mb-4">
              {message}
            </div>
          )}

          {gameState && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                  Round {gameState.round}
                </h2>
                <p className="text-xl text-gray-600">{gameState.currentQuestion}</p>
              </div>

              {!gameState.isRevealed ? (
                <div className="space-y-4">
                  <input
                    type="text"
                    value={currentAnswer}
                    onChange={(e) => setCurrentAnswer(e.target.value)}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring focus:ring-pink-200 p-2"
                    placeholder="Type your answer..."
                  />
                  <button
                    onClick={handleSubmitAnswer}
                    className="w-full bg-pink-500 text-white py-2 px-4 rounded-md hover:bg-pink-600 transition duration-200"
                  >
                    Submit Answer
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(gameState.playerAnswers).map(([player, answer]) => (
                    <div key={player} className="bg-gray-50 p-4 rounded-lg">
                      <div className="font-medium text-gray-600">{player}</div>
                      <div className="text-lg">{answer}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Start Game Button */}
          {playerCount >= 2 && !gameStarted && (
            <button
              onClick={handleStartGame}
              className="w-full bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600 transition duration-200"
            >
              Start Game
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
</create_file>
