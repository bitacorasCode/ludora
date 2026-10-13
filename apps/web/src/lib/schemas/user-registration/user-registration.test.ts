import { describe, expect, it } from "vitest";

import esMessages from '@/messages/es.json';

import { createUserRegistrationSchema } from "./user-registration";

const userRegistrationSchema = createUserRegistrationSchema(
    (key) => esMessages.Register.validation[key],
);

const validData = {
    nickname: "Juanito123",
    names: "Juan",
    lastNames: "Pérez García",
    birthDate: new Date("1990-01-01"),
    email: "juan@example.com",
    password: "contraseña123",
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

    it("rejects with a short names field", () => {
        const result = userRegistrationSchema.safeParse({
            ...validData,
            names: "A",
        });
        expect(result.success).toBe(false);
        expect(result.error?.issues[0].message).toBe(esMessages.Register.validation.namesMin);
    });

    it("rejects with a short lastNames field", () => {
        const result = userRegistrationSchema.safeParse({
            ...validData,
            lastNames: "B",
        });
        expect(result.success).toBe(false);
        expect(result.error?.issues[0].message).toBe(esMessages.Register.validation.lastNamesMin);
    });

    it("rejects with an invalid email", () => {
        const result = userRegistrationSchema.safeParse({
            ...validData,
            email: "not-an-email",
        });
        expect(result.success).toBe(false);
        expect(result.error?.issues[0].message).toBe(esMessages.Register.validation.emailInvalid);
    });

    it("rejects with an empty names field", () => {
        const result = userRegistrationSchema.safeParse({
            ...validData,
            names: "",
        });
        expect(result.success).toBe(false);
        expect(result.error?.issues[0].message).toBe(esMessages.Register.validation.namesMin);
    });

    it("rejects without a birth date", () => {
        const result = userRegistrationSchema.safeParse({
            ...validData,
            birthDate: undefined,
        });
        expect(result.success).toBe(false);
        expect(result.error?.issues[0].message).toBe(esMessages.Register.validation.birthDateRequired);
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
