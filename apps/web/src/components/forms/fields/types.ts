import { Control, FieldValues, Path } from "react-hook-form";

export type BaseFormFieldProps<T extends FieldValues> = {
    control: Control<T>;
    name: Path<T>;
    label: string;
};