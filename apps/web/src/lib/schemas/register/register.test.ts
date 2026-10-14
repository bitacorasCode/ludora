import { describe, expect, it } from "vitest";

import esMessages from '@/messages/es.json';

import { createRegisterSchema } from "./register";

const registerSchema = createRegisterSchema(
    (key) => esMessages.Register.validation[key],
);

const validData = {
    nickname: "Juanito123",
    email: "juan@example.com",
    password: "contraseña123",
    confirmPassword: "contraseña123",
};

describe("registerSchema", () => {
    it("accepts with all valid fields", () => {
        const result = registerSchema.safeParse(validData);
        expect(result.success).toBe(true);
    });

    it("rejects with a short nickname field", () => {
        const result = registerSchema.safeParse({
            ...validData,
            nickname: "A",
        });
        expect(result.success).toBe(false);
        expect(result.error?.issues[0].message).toBe(esMessages.Register.validation.nicknameMin);
    });

    it("rejects with an invalid email", () => {
        const result = registerSchema.safeParse({
            ...validData,
            email: "not-an-email",
        });
        expect(result.success).toBe(false);
        expect(result.error?.issues[0].message).toBe(esMessages.Register.validation.emailInvalid);
    });

    it("rejects with a short password", () => {
        const result = registerSchema.safeParse({
            ...validData,
            password: "short",
        });
        expect(result.success).toBe(false);
        expect(result.error?.issues[0].message).toBe(esMessages.Register.validation.passwordMin);
    });
});
