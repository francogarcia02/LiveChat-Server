export async function getTwoId ({user1, user2, db}) {
    let user1_id
    let user1_result

    let user2_id
    let user2_result

    try {
        user1_result = await db.execute({
            sql: `
                SELECT * FROM users WHERE username = ?;
            `,
            args: [user1]
        });
    } catch (error) {
        return {error: 'Error buscando el usuario 1', error}
    }

    try {
        user2_result = await db.execute({
            sql: `
                SELECT * FROM users WHERE username = ?;
            `,
            args: [user2]
        });
    } catch (error) {
        return {error: 'Error buscando el usuario 2', error}
    }
    
    if (user1_result.rows.length === 0) {
        return {error: 'Usuario no encontrado en la base de datos'}
    } else{
        user1_id = user1_result.rows[0]
    }
    
    if (user2_result.rows.length === 0) {
        return {error: 'Usuario no encontrado en la base de datos'}
    } else{
        user2_id = user2_result.rows[0]
    }

    const result = {
        user1_id: user1_id.id,
        user2_id: user2_id.id
    }
    
    return result
}

export async function getOneId ({username, db}) {
    let user_id
    let user_result

    try {
        user_result = await db.execute({
            sql: `
                SELECT * FROM users WHERE username = ?;
            `,
            args: [username]
        });
    } catch (error) {
        return {error: 'Error buscando el usuario 1', error}
    }

    if (user_result.rows.length === 0) {
        return {error: 'Usuario 1 no encontrado en la base de datos'}
    } else{
        user_id = user_result.rows[0]
    }

    return user_id.id
} 