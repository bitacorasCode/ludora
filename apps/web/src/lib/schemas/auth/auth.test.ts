import { describe, expect, it } from "vitest";

import esMessages from '@/messages/es.json';

import { createLoginSchema, createPasswordResetSchema, createRecoveryRequestSchema } from "./auth";

const loginSchema = createLoginSchema(
    (key) => esMessages.Login.validation[key],
);

const recoveryRequestSchema = createRecoveryRequestSchema(
    (key) => esMessages.PasswordRecovery.validation[key],
);

const passwordResetSchema = createPasswordResetSchema(
    (key) => esMessages.PasswordRecovery.validation[key],
);

const validLoginData = {
    email: "juan@example.com",
    password: "contraseña123",
};

const validRecoveryRequestData = {
    email: "juan@example.com",
};

const validPasswordResetData = {
    password: "contraseña123",
    confirmPassword: "contraseña123",
};

describe("loginSchema", () => {
    it("accepts with all valid fields", () => {
        const result = loginSchema.safeParse(validLoginData);
        expect(result.success).toBe(true);
    });

    it("rejects with an invalid email", () => {
        const result = loginSchema.safeParse({
            ...validLoginData,
            email: "not-an-email",
        });
        expect(result.success).toBe(false);
        expect(result.error?.issues[0].message).toBe(esMessages.Login.validation.emailInvalid);
    });

    it("rejects with an empty password", () => {
        const result = loginSchema.safeParse({
            ...validLoginData,
            password: "",
        });
        expect(result.success).toBe(false);
        expect(result.error?.issues[0].message).toBe(esMessages.Login.validation.passwordRequired);
    });
});

describe("recoveryRequestSchema", () => {
    it("accepts with a valid email", () => {
        const result = recoveryRequestSchema.safeParse(validRecoveryRequestData);
        expect(result.success).toBe(true);
    });

    it("rejects with an invalid email", () => {
        const result = recoveryRequestSchema.safeParse({
            ...validRecoveryRequestData,
            email: "not-an-email",
        });
        expect(result.success).toBe(false);
        expect(result.error?.issues[0].message).toBe(esMessages.PasswordRecovery.validation.emailInvalid);
    });
});

describe("passwordResetSchema", () => {
    it("accepts with all valid fields", () => {
        const result = passwordResetSchema.safeParse(validPasswordResetData);
        expect(result.success).toBe(true);
    });

    it("rejects with a short password", () => {
        const result = passwordResetSchema.safeParse({
            ...validPasswordResetData,
            password: "short",
        });
        expect(result.success).toBe(false);
        expect(result.error?.issues[0].message).toBe(esMessages.PasswordRecovery.validation.passwordMin);
    });

    it("rejects when the password confirmation is empty", () => {
        const result = passwordResetSchema.safeParse({
            ...validPasswordResetData,
            confirmPassword: "",
        });
        expect(result.success).toBe(false);
        expect(result.error?.issues[0].message).toBe(esMessages.PasswordRecovery.validation.confirmPasswordRequired);
    });

    it("rejects when the passwords do not match", () => {
        const result = passwordResetSchema.safeParse({
            ...validPasswordResetData,
            confirmPassword: "otraContraseña123",
        });
        expect(result.success).toBe(false);
        expect(result.error?.issues[0].message).toBe(esMessages.PasswordRecovery.validation.passwordMismatch);
    });
});
