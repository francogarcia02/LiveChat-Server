import crypto from 'node:crypto'
import { getOneId, getTwoId } from '../utils/getUsersIds.js';

export class ConversationRepository {
    static async create ({user1, user2, idNot, db}) {
        const result = await getTwoId({user1, user2, db})

        try {
            const deleteResult = await db.execute({
                sql: `DELETE FROM notifications WHERE id = ?`,
                args: [idNot]
            })
        } catch (error) {
            return {error: error}
        }

        if(user1 === user2) {
            return {error: 'You cant create a conversation with yourself'}
        }

        if(result.error){
            return result
        }

        const user1_id = result.user1_id
        const user2_id = result.user2_id

        const id = crypto.randomUUID()
        let response
        try {
            const result = await db.execute({
                sql: `
                    INSERT INTO conversations (id, user1_id, user2_id) 
                    VALUES (?, ?, ?);
                `,
                args: [id, user1_id, user2_id]
            });
            response = result
        } catch (error) {   
            return {error: 'Error creando la conversacion', error}
        }
        console.log(result)
        return response
    }
    
    static async delete ({user1, user2, db}) {
        const ids = await getTwoId({user1, user2, db})

        if(ids.error){
            return ids
        }

        const user1_id = ids.user1_id
        const user2_id = ids.user2_id

        let conversation
        try {
            const result = await db.execute({
                sql: `
                    SELECT *
                    FROM conversations
                    WHERE 
                        (user1_id = ? AND user2_id = ?) OR 
                        (user1_id = ? AND user2_id = ?)`,
                args: [user1_id, user2_id, user2_id, user1_id]
            });
            conversation = result.rows[0]
        } catch (error) {   
            return {error: 'Error buscando la conversacion', error}
        }
        if (!conversation) {
            const error = 'Conversacion no encontrada'
            return {error: error}
        }
        
        const conversation_id = conversation.id

        try {
            await db.execute({
                sql: `DELETE FROM messages WHERE conversation_id = ?`,
                args: [conversation_id]
            });
        } catch (error) {   
            return {error: 'Error eliminando los mensajes de la conversacion', error}
        }

        let result
        try {
            result = await db.execute({
                sql: `DELETE FROM conversations WHERE id = ?`,
                args: [conversation_id]
            });
        } catch (error) {   
            return {error: 'Error eliminando la conversacion', error}
        }
        return result
    }
    
    static async getAll ({username, db}) {
        const id = await getOneId({username, db})
        
        let conversations
        try {
            const result = await db.execute({
                sql: `SELECT * FROM conversations
                    WHERE user1_id = ? OR user2_id = ?`,
                args: [id, id]
            })
            conversations = result.rows
        } catch (error) {
            return {error: 'Error al buscar conversaciones ', error}
        }

        let transformed_conversations = []
        
        for (const conv of conversations) {
            try {
                const username1Row = await db.execute({
                    sql: `SELECT * FROM users WHERE id = ?`,
                    args: [conv.user1_id],
                });
                const username2Row = await db.execute({
                    sql: `SELECT * FROM users WHERE id = ?`,
                    args: [conv.user2_id],
                });
    
                const username1 = username1Row.rows[0]?.username || 'Unknown';
                const username2 = username2Row.rows[0]?.username || 'Unknown';
    
                transformed_conversations.push({
                    username1,
                    username2,
                    id: conv.id,
                });
            } catch (error) {
                return { error: 'Error obteniendo datos de usuarios', details: error };
            }
        }

        return transformed_conversations
    }

    static async sendNotification ({sender, receiver, db}) {
        const result = await getTwoId({user1: sender, user2: receiver, db})
        if(result.error){
            return result
        }

        const id = crypto.randomUUID()
        let response
        try {
            const result = await db.execute({
                sql: `
                    INSERT INTO notifications (id, sender, receiver) 
                    VALUES (?, ?, ?);
                `,
                args: [id, sender, receiver]
            });
            response = result
        } catch (error) {   
            return error
        }
        return response
    }

    static async getNotifications ({receiver, db}) {
        let notifications
        try {
            const result = await db.execute({
                sql: `SELECT * FROM notifications WHERE receiver = ?`,
                args: [receiver]
            })
            notifications = result.rows
        } catch (error) {
            return {error: error}
        }

        let transformed_notifications = []
        for(const not of notifications) {
            const transformed = {
                id: not.id,
                receiver: not.receiver,
                sender: not.sender
            }
            transformed_notifications.push(transformed)
        }

        return transformed_notifications
    }

    static async deleteNotification ({id, db}) {
        console.log(id)
        let result
        try {
            result = await db.execute({
                sql: `DELETE FROM notifications WHERE id = ?`,
                args: [id]
            })
        } catch (error) {
            return {error: error}
        }
        if(result.rowsAffected === 0){
            return {error: 'Notification didnt finded'}
        }
        return result
    }
}