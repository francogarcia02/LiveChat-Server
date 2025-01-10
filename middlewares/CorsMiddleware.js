import cors from 'cors';

export const corsMiddleWare = () => {
    return cors({
        origin: '*', // Permite solicitudes desde cualquier dominio
        credentials: false, // No se permite el envío de credenciales (cookies, headers personalizados, etc.)
        methods: ['GET', 'POST', 'PUT', 'DELETE'], 
        allowedHeaders: ['Content-Type', 'Authorization']
    });
};
