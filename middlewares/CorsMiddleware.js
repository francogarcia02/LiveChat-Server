import cors from 'cors';

const ACCEPTED_ORIGINS = [
    'http://localhost:4000',
    'http://localhost:3000',
    'http://localhost:8080',
    'https://live-chat-client-steel.vercel.app',
    'http://live-chat-client-steel.vercel.app'
];

export const corsMiddleWare = ({accepted_origins = ACCEPTED_ORIGINS} = {}) => {
    
    return cors({
        origin: (origin, callback) => {
            if (accepted_origins.includes(origin)) {
                return callback(null, true);
            }

            if (!origin) {
                // Permitir solicitudes desde herramientas como Postman o Curl
                return callback(null, true);
            }

            return callback(new Error(`Origen no permitido: ${origin}`));
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE'], 
        allowedHeaders: ['Content-Type', 'Authorization']
    });
};