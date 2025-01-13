import express from 'express'
import logger from 'morgan'
import { createServer } from 'node:http'
import { Server } from 'socket.io'
import dotenv from 'dotenv'
import { createClient } from '@libsql/client'
import { PORT, SECRET_SWT_KEY } from './config.js'

import { UserRepository } from './repositories/user-repository.js'
import { ConversationRepository } from './repositories/conversation-repository.js'

import { corsMiddleWare } from './middlewares/CorsMiddleware.js'
import cors from 'cors'

import jwt from 'jsonwebtoken'
import cookieParser from 'cookie-parser'

dotenv.config()
const app = express()
const server = createServer(app)
const io = new Server(server, {
    connectionStateRecovery: {},
    cors: {
        origin: "*",
    }
})

const db = createClient({
    url: 'libsql://live-chat-fran02fcg.turso.io',
    authToken: process.env.DB_TOKEN
})

// Crear tablas

await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );   
`)


await db.execute(`
    CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    sender TEXT,
    receiver TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(sender, receiver)
    )
`)

await db.execute(`
    CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    user1_id TEXT,
    user2_id TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user1_id, user2_id),
    FOREIGN KEY (user1_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (user2_id) REFERENCES users(id) ON DELETE CASCADE
);    
`)


await db.execute(`
    CREATE TABLE IF NOT EXISTS messages_global (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    username TEXT NOT NULL
);
`)

await db.execute(`
    CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id TEXT NOT NULL,     
    sender TEXT NOT NULL,           
    content TEXT,  
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (sender) REFERENCES users(username) ON DELETE CASCADE
);
`)

io.on('connection', async (socket) => {
    socket.on('join_conversation', (conversationId) => {
        socket.join(conversationId);
        console.log(`El usuario ${socket.id} se unio a la sala ${conversationId}`)
    });

    socket.on('chat_message', async ({ conversationId, msg, username }) => {
        let result;
        try {
            result = await db.execute({
                sql: `INSERT INTO messages (conversation_id, sender, content) VALUES (?, ?, ?)`,
                args: [conversationId, username, msg],
            });
        } catch (error) {
            console.error('Error en el catch: ', error);
            return;
        }
        io.to(conversationId).emit('chat_message', {
            id: result.lastInsertRowid.toString(),
            msg,
            username,
        });
    });

    

    socket.on('fetch_messages', async ({ conversationId, offset = 0 }) => {
        try {
            const result = await db.execute({
                sql: `SELECT * FROM messages WHERE conversation_id = ? AND id > ? ORDER BY id ASC`,
                args: [conversationId, offset],
            });

            result.rows.forEach((row) => {
                socket.emit('chat_message', {
                    id: row.id.toString(),
                    msg: row.content,
                    username: row.sender,
                });
            });
        } catch (error) {
            console.error(error);
        }
    });

    socket.on('disconnect', () => {
        console.log('A user has disconnected!')
    })
})

//MiddelWares
app.use(express.json());
app.use(corsMiddleWare())
app.use(cookieParser())

app.use((req, res, next) => {
    const token = req.cookies.access_token;
    req.session = req.session || { user: null };

    if (!token) {
        console.log("No se encontró la cookie 'access_token'");
        return next();
    }

    try {
        const data = jwt.verify(token, SECRET_SWT_KEY);
        req.session.user = data;
    } catch (error) {
        console.error("Error al verificar el token:", error.message);
        req.session.user = null;
    }

    next();
});

//Users Routes

app.post('/login', async (req, res) => {
    const {username, password} = req.body
    
    let result
    let token

    try {
        result = await UserRepository.login({username, password, db})
        token = jwt.sign(
            {
                id: result._id, 
                username: result.username
            }, 
            SECRET_SWT_KEY,
            {
                expiresIn: '1h'
            }
        )
    } catch (error) {
        if (error.message === 'Usuario no encontrado') {
            return res.status(404).json({ error: 'Incorrect Password or Username' });
        } else if (error.message === 'Contraseña incorrecta') {
            return res.status(401).json({ error: 'Incorrect Password or Username' });
        } else {
            return res.status(500).json({ error: 'Server error' });
        }
    }

    if(result.error){
        res.status(400).json({error: result.error})
    }

    res
    .cookie('access_token',token,{
        httpOnly: false,
        secure: process.eventNames.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 1000 * 60  * 60
    })
    .json({
        message: 'Login successfull',
        user: { id: result._id, username: result.username }
    });

})

app.post('/register', async (req, res) => {
    const { username, password, recaptcha } = req.body;

    const recaptchaResponse = await fetch('https://www.google.com/recaptcha/api/siteverify', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded', 
        },
        body: new URLSearchParams({
            secret: '6Leb_bEqAAAAAM3wMF4Mcuv0W5oE7FplROYb7aUZ', 
            response: recaptcha 
        }).toString(),
    });

    const data = await recaptchaResponse.json();
    /*
    if (!data.success) {
        return res.status(400).json({ error: 'reCAPTCHA verification failed'});
    }
    */

    let result
    
    try {
        result = await UserRepository.create({ username, password, db });
    } catch (error) {
        res.status(500).json({error: error });
    }

    if(!result.error){
        res.json({
            message: 'Create Conversation successfull',
            result: result
        });
    }
    res.json({
        error: result.error
    });
});

app.post('/logout', (req, res) => {
    res
    .clearCookie('access_token')
    .redirect('/')
})

app.get('/getData', (req, res) => {
    const {user} = req.session

    if(!user){
        return res.status(403).json({Error : 'User undefined'})
    }
    res.json(user);
})

//Messages Routes

app.post('/send-notification', async (req, res) => {
    const {sender, receiver} = req.body

    let result
    try {
        result = await ConversationRepository.sendNotification({ sender: sender, receiver: receiver, db });
    } catch (error) {
        res.status(500).json({'Error en el catch': error})
    }

    if(!result.error){
        return res.json({
            message: 'Notification sent',
            result: result
        });
    }

    console.log(result)
    if(result.error.code){
        res.status(500).json({'Error': result.error.code})
    } else{
        res.status(500).json({'Error': result.error})
    }
    
})

app.post('/get-notifications', async (req, res) => {
    const { receiver } = req.body
    const result = await ConversationRepository.getNotifications({receiver: receiver, db})
    if(!result.error){
        return res.json({
            message: 'Notifications Retrieved Successfully',
            result: result
        });
    }

    res.status(500).json({error: result.error})

})

app.post('/reject-notification', async (req, res) => {
    const { id } = req.body
    console.log(id)
    let result
    try {
        result = await ConversationRepository.deleteNotification({id: id, db})
    } catch (error) {
        res.status(500).json({'Error en el catch': error})
    }

    if(!result.error){
        return res.json({
            message: 'Delete notification successfull',
            result: result
        });
    }
    if(result.error.code){
        res.status(500).json({'Error': result.error.code})
    } else{
        res.status(500).json({'Error': result.error})
    }
    
})

app.post('/create-conversation', async (req, res) => {
    const { username1, username2, idNot } = req.body;
    let result
    try {
        result = await ConversationRepository.create({ user1: username1, user2: username2, idNot: idNot,  db });
    } catch (error) {
        res.status(500).json({'Error en el catch': error})
    }

    if(!result.error){
        return res.json({
            message: 'Create Conversation successfull',
            result: result
        });
    }
    if(result.error.code){
        res.status(500).json({'Error': result.error.code})
    } else{
        res.status(500).json({'Error': result.error})
    }
});

app.post('/delete-conversation', async (req, res) => {
    const { username1, username2 } = req.body;
    let result
    
    try {
        result = await ConversationRepository.delete({ user1: username1, user2: username2, db });
    } catch (error) {
        res.status(500).json({'Error en el catch': error})
    }


    if(!result.error){
        return res.json({
            message: 'Delete Conversation successfull',
            result: result
        });
    }

    res.status(500).json({'Error': result.error})
    
});

app.post('/get-conversations', async (req, res) => {
    const { username } = req.body
    const result = await ConversationRepository.getAll({username, db})

    if(!result.error){
        return res.json({
            message: 'Conversations Retrieved Successfully',
            result: result
        });
    }
    

    res.status(500).json({error: result.error})

})

app.use(logger('dev'))

server.listen(PORT, () => {
    console.log('Aplicación corriendo en el puerto: ', PORT)
})
