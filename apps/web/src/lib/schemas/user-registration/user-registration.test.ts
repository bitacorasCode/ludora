import { describe, expect, it } from "vitest";

import esMessages from '@/messages/es.json';

import { createUserRegistrationSchema } from "./user-registration";

const userRegistrationSchema = createUserRegistrationSchema(
    (key) => esMessages.Register.validation[key],
);

const validData = {
    nickname: "Juanito123",
    email: "juan@example.com",
    password: "contraseña123",
    confirmPassword: "contraseña123",
};

describe("userRegistrationSchema", () => {
    it("accepts with all valid fields", () => {
        const result = userRegistrationSchema.safeParse(validData);
        expect(result.success).toBe(true);
    });

    it("rejects with a short nickname field", () => {
        const result = userRegistrationSchema.safeParse({
            ...validData,
            nickname: "A",
        });
        expect(result.success).toBe(false);
        expect(result.error?.issues[0].message).toBe(esMessages.Register.validation.nicknameMin);
    });

    it("rejects with an invalid email", () => {
        const result = userRegistrationSchema.safeParse({
            ...validData,
            email: "not-an-email",
        });
        expect(result.success).toBe(false);
        expect(result.error?.issues[0].message).toBe(esMessages.Register.validation.emailInvalid);
    });

    it("rejects with a short password", () => {
        const result = userRegistrationSchema.safeParse({
            ...validData,
            password: "short",
        });
        expect(result.success).toBe(false);
        expect(result.error?.issues[0].message).toBe(esMessages.Register.validation.passwordMin);
    });
});
