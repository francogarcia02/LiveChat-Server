import { z } from 'zod';

const passwordSchema = z.string()
.min(8, { message: "The password must be at least 8 characters long" })
.max(20, { message: "The password cannot be longer than 20 characters" })
.regex(/[A-Z]/, { message: "The password must contain at least one uppercase letter" })
.regex(/[a-z]/, { message: "The password must contain at least one lowercase letter" })
.regex(/[0-9]/, { message: "The password must contain at least one number" })
.regex(/[\W_]/, { message: "The password must contain at least one special character" });// carácter especial como @, #, etc.

const userSchema = z.object({
    username: z.string({
        invalid_type_error: 'Invalid type of username',
        required_error: 'Username required'
    }),
    password: passwordSchema
});


export function validateUser (object)  {
    return userSchema.safeParse(object)
}

export function validatePartialMovie (object) {
    return  movieSchema.partial().safeParse(object)
}