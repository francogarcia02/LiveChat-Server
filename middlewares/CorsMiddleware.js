import cors from 'cors';

const ACCEPTED_ORIGINS = [
    'http://localhost:4000',
    'http://localhost:3000',
    'http://localhost:8080',
    'https://live-chat-client-steel.vercel.app',
    'http://live-chat-client-steel.vercel.app',
    'https://live-chat-client-francogarcia02-admins-projects.vercel.app/',
    'https://live-chat-client-git-main-francogarcia02-admins-projects.vercel.app/',
    'https://live-chat-client-icgbad81c-francogarcia02-admins-projects.vercel.app',
    /\.vercel\.app$/,
];

export const corsMiddleWare = ({accepted_origins = ACCEPTED_ORIGINS} = {}) => {
    
    return cors({
        origin: (origin, callback) => {
            if (accepted_origins.includes(origin)) {
                return callback(null, true);
            }

            if (!origin) {
                return callback(null, true);
            }

            return callback(new Error(`Origen no permitido: ${origin}`));
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], 
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Custom-Header']
    });
};