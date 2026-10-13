import { describe, expect, it } from "vitest";

import { userRegistrationSchema } from "./user-registration";

const validData = {
    nickname: "Juanito123",
    names: "Juan",
    lastNames: "Pérez García",
    birthDate: new Date("1990-01-01"),
    email: "juan@example.com",
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
        expect(result.error?.issues[0].message).toBe("Nickname: mínimo 2 caracteres");
    });

    it("rejects with a short names field", () => {
        const result = userRegistrationSchema.safeParse({
            ...validData,
            names: "A",
        });
        expect(result.success).toBe(false);
        expect(result.error?.issues[0].message).toBe("Nombres: mínimo 2 caracteres");
    });

    it("rejects with a short lastNames field", () => {
        const result = userRegistrationSchema.safeParse({
            ...validData,
            lastNames: "B",
        });
        expect(result.success).toBe(false);
        expect(result.error?.issues[0].message).toBe("Apellidos: mínimo 2 caracteres");
    });

    it("rejects with an invalid email", () => {
        const result = userRegistrationSchema.safeParse({
            ...validData,
            email: "not-an-email",
        });
        expect(result.success).toBe(false);
        expect(result.error?.issues[0].message).toBe("Correo: correo inválido");
    });

    it("rejects with an empty names field", () => {
        const result = userRegistrationSchema.safeParse({
            ...validData,
            names: "",
        });
        expect(result.success).toBe(false);
        expect(result.error?.issues[0].message).toBe("Nombres: mínimo 2 caracteres");
    });
});
