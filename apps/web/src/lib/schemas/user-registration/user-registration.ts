import { z } from "zod";

export const userRegistrationSchema = z.object({
    nickname: z.string().min(2, "Nickname: mínimo 2 caracteres"),
    names: z.string().min(2, "Nombres: mínimo 2 caracteres"),
    lastNames: z.string().min(2, "Apellidos: mínimo 2 caracteres"),
    birthDate: z.date(),
    email: z.email("Correo: correo inválido"),
});

export type UserRegistrationFormData = z.infer<typeof userRegistrationSchema>;
