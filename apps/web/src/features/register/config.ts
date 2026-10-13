export const userFields = [
    {
        name: 'nickname',
        label: 'Nickname',
        placeholder: 'Juanito123',
        defaultValue: '',
        type: 'string',
    },
    {
        name: 'names',
        label: 'Nombres',
        placeholder: 'Juan',
        defaultValue: '',
        type: 'string',
    },
    {
        name: 'lastNames',
        label: 'Apellidos',
        placeholder: 'Perez',
        defaultValue: '',
        type: 'string',
    },
    {
        name: 'birthDate',
        label: 'Fecha de nacimiento',
        placeholder: null,
        defaultValue: undefined,
        type: 'date',
    },
    {
        name: 'email',
        label: 'Correo',
        placeholder: 'juan.perez@gmail.com',
        defaultValue: '',
        type: 'string',
    }
] as const;

export const userDefaultValues = Object.fromEntries(
    userFields.map((field) => [field.name, field.defaultValue]),
);