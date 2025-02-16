import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { compareTwoStrings } from 'string-similarity';
import { questions } from './src/questions.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

app.use(express.static(join(__dirname, 'dist')));

const rooms = new Map();
const ROUNDS = 10;
const ANSWER_TIME = 20;
const SIMILARITY_THRESHOLD = 0.8;

io.on('connection', (socket) => {
  let playerRoom = null;

  socket.on('joinRoom', ({ name, roomCode }) => {
    let room = rooms.get(roomCode);
    
    if (!room) {
      room = {
        code: roomCode,
        players: [],
        currentQuestion: 0,
        score: 0,
        round: 1,
        isGameStarted: false
      };
      rooms.set(roomCode, room);
    }

    if (room.players.length >= 2) {
      socket.emit('gameError', 'Room is full!');
      return;
    }

    const player = { id: socket.id, name, roomCode };
    room.players.push(player);
    socket.join(roomCode);
    playerRoom = roomCode;

    if (room.players.length === 2) {
      startGame(roomCode);
    } else {
      socket.emit('message', 'Waiting for your partner to join...');
    }
  });

  socket.on('submitAnswer', ({ answer }) => {
    if (!playerRoom) return;

    const room = rooms.get(playerRoom);
    if (!room) return;

    const player = room.players.find(p => p.id === socket.id);
    if (!player) return;

    player.answer = answer;

    const allAnswered = room.players.every(p => p.answer);
    if (allAnswered) {
      revealAnswers(playerRoom);
    }
  });

  socket.on('disconnect', () => {
    if (playerRoom) {
      const room = rooms.get(playerRoom);
      if (room) {
        room.players = room.players.filter(p => p.id !== socket.id);
        if (room.players.length === 0) {
          rooms.delete(playerRoom);
        } else {
          io.to(playerRoom).emit('message', 'Your partner has disconnected.');
        }
      }
    }
  });
});

function startGame(roomCode) {
  const room = rooms.get(roomCode);
  if (!room) return;

  room.isGameStarted = true;
  nextQuestion(roomCode);
}

function nextQuestion(roomCode) {
  const room = rooms.get(roomCode);
  if (!room) return;

  if (room.round > ROUNDS) {
    endGame(roomCode);
    return;
  }

  room.players.forEach(p => p.answer = undefined);
  const questionIndex = Math.floor(Math.random() * questions.length);
  
  const gameState = {
    currentQuestion: questions[questionIndex],
    timeRemaining: ANSWER_TIME,
    round: room.round,
    score: room.score,
    playerAnswers: {},
    isRevealed: false
  };

  io.to(roomCode).emit('gameState', gameState);

  let timeLeft = ANSWER_TIME;
  const timer = setInterval(() => {
    timeLeft--;
    if (timeLeft >= 0) {
      io.to(roomCode).emit('gameState', { ...gameState, timeRemaining: timeLeft });
    }
    if (timeLeft === 0 || room.players.every(p => p.answer)) {
      clearInterval(timer);
      revealAnswers(roomCode);
    }
  }, 1000);
}

function revealAnswers(roomCode) {
  const room = rooms.get(roomCode);
  if (!room) return;

  const playerAnswers = {};
  room.players.forEach(p => {
    playerAnswers[p.name] = p.answer || '(No answer)';
  });

  if (room.players.every(p => p.answer)) {
    const similarity = compareTwoStrings(
      room.players[0].answer.toLowerCase(),
      room.players[1].answer.toLowerCase()
    );
    
    if (similarity >= SIMILARITY_THRESHOLD) {
      room.score++;
      io.to(roomCode).emit('message', 'Match! You earned a point! 🎉');
    } else {
      io.to(roomCode).emit('message', 'No match. Try to think more alike! 💭');
    }
  }

  io.to(roomCode).emit('gameState', {
    currentQuestion: questions[room.currentQuestion],
    timeRemaining: 0,
    round: room.round,
    score: room.score,
    playerAnswers,
    isRevealed: true
  });

  setTimeout(() => {
    room.round++;
    nextQuestion(roomCode);
  }, 5000);
}

function endGame(roomCode) {
  const room = rooms.get(roomCode);
  if (!room) return;

  const percentage = (room.score / ROUNDS) * 100;
  let message = '';

  if (percentage >= 80) {
    message = "Perfect match! You're incredibly in sync! 💑";
  } else if (percentage >= 60) {
    message = "Great connection! Keep growing together! 💕";
  } else if (percentage >= 40) {
    message = "You're getting there! Keep learning about each other! 💫";
  } else {
    message = "Room for growth! Every couple's journey is unique! 🌱";
  }

  io.to(roomCode).emit('gameState', {
    currentQuestion: "Game Over!",
    timeRemaining: 0,
    round: ROUNDS,
    score: room.score,
    playerAnswers: {},
    isRevealed: true
  });

  io.to(roomCode).emit('message', message);
  rooms.delete(roomCode);
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});