
import bcrypt from 'bcrypt'
import { validateUser } from '../schemas/user.js'
import { ADEREZO_CONFIG } from '../config.js'
import crypto from 'node:crypto'

export class UserRepository {
    static async create ({username, password, db}) {
        //Validar campos
        const result = validateUser({username: username, password: password})
        if(result.error){
            let errorMessages = []
            result.error.issues.forEach(error => {
                errorMessages.push(error.message)
            })
            return({error: errorMessages}) 
        }

        //Verificar que no existe otro usuario con ese nombre  
        try {
            const result = await db.execute({
                sql: `
                    SELECT  
                        username
                    FROM users
                    WHERE username = ?;
                `,
                args: [username]
            });

            if (result.rows.length === 1) {
                return ({error: 'Username just exists'});
            }
        } catch (error) {
            return ({error: error});
        }

        const id = crypto.randomUUID()
        const salt = await bcrypt.genSalt(5)
        const passwordHashed = await bcrypt.hash(password, salt)

        try {
            await db.execute({
                sql: `
                    INSERT INTO users (id, username, password_hash) 
                    VALUES (?, ?, ?);
                `,
                args: [id, username, passwordHashed]
            });
        } catch (error) {   
            return ({error: error});
        }
        

        return id
    }
    static async login({ username, password, db }) {
        const result = validateUser({ username, password });
        if (result.error) {
            throw new Error(result.error);
        }
    
        let userTable;
        try {
            userTable = await db.execute({
                sql: `
                    SELECT * FROM users WHERE username = ?;
                `,
                args: [username]
            });
        } catch (error) {
            console.error('Error ejecutando la consulta:', error);
            throw new Error('Error al conectarse a la base de datos.');
        }
    
        if (userTable.rows.length === 0) {
            throw new Error('Usuario no encontrado');
        }
    
        const user = userTable.rows[0];
        const isValid = await bcrypt.compare(password, user.password_hash);
    
        if (!isValid) {
            throw new Error('Contraseña incorrecta');
        }
    
        return {
            _id: user.id,
            username: user.username
        };
    }
    
}