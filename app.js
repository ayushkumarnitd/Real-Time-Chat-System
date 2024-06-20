const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const path = require('path');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

// Set EJS as the template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware to generate a nonce for each request
app.use((req, res, next) => {
    res.locals.nonce = uuidv4();
    next();
});

// Security: Set up helmet for security headers, including CSP
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "http://127.0.0.1:3000", (req, res) => `'nonce-${res.locals.nonce}'`],
            // Add other directives as needed
        }
    }
}));

// Serve the socket.io client library
app.use('/socket.io', express.static(path.join(__dirname, 'node_modules', 'socket.io', 'client-dist')));

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

app.get('/chat', (req, res) => {
    res.render('chat');
});

io.on('connection', (socket) => {
    console.log('New WebSocket connection');

    socket.on('joinRoom', ({ username, room }) => {
        socket.join(room);

        // Welcome current user
        socket.emit('message', {
            username: 'Chat Bot',
            text: 'Welcome to the chat',
            time: new Date().toLocaleTimeString(),
        });

        // Broadcast when a user connects
        socket.broadcast.to(room).emit('message', {
            username: 'Chat Bot',
            text: `${username} has joined the chat`,
            time: new Date().toLocaleTimeString(),
        });

        // Send users and room info
        io.to(room).emit('roomUsers', {
            room,
            users: getUsersInRoom(room)
        });
    });

    socket.on('chatMessage', (msg) => {
        io.to(socket.room).emit('message', {
            username: socket.username,
            text: msg,
            time: new Date().toLocaleTimeString(),
        });
    });

    socket.on('disconnect', () => {
        io.emit('message', {
            username: 'Chat Bot',
            text: 'A user has left the chat',
            time: new Date().toLocaleTimeString(),
        });
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
