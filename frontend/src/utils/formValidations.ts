import { useState } from "react";
import { formatCpf, formatCnpj, isValidCpf, isValidCnpj } from "@brazilian-utils/brazilian-utils";

export function validateNameValue(value: string): string {
    const trimmed = value.trim();
    if (trimmed.length < 3) return "Nome deve ter ao menos 3 caracteres.";
    if (!/^[A-Za-zÀ-ÖØ-öø-ÿ\s]+$/.test(trimmed)) return "Nome não pode conter números ou caracteres especiais.";
    return "";
}

export function validateCpfValue(raw: string): string {
    if (!raw.trim()) return "CPF é obrigatório.";
    return !isValidCpf(raw) ? "CPF inválido." : "";
}

export function validateTelValue(raw: string): string {
    const onlyDigits = raw.replace(/\D/g, "");
    if (onlyDigits.length !== 11) return "Telefone inválido.";
    if (onlyDigits[2] !== "9") return "Telefone inválido.";
    return "";
}

export function validateCnpjValue(raw: string): string {
    if (!raw.trim()) return "CNPJ é obrigatório.";
    return !isValidCnpj(raw) ? "CNPJ inválido." : "";
}

export function validateEmailValue(value: string): string {
    if (!value.trim()) return "E-mail é obrigatório.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) return "E-mail inválido.";
    return "";
}

export function useNameField() {
    const [name, setName] = useState("");
    const [nameError, setNameError] = useState("");

    function validateName(value: string): string {
        return validateNameValue(value);
    }

    function handleNameChange(event: React.ChangeEvent<HTMLInputElement>) {
        const value = event.target.value;
        setName(value);
        setNameError(validateName(value));
        return value;
    }

    return { name, nameError, setName, setNameError, handleNameChange, validateName };
}

export function useCpfField() {
    const [cpf, setCpf] = useState("");
    const [cpfError, setCpfError] = useState("");

    function handleCpfChange(event: React.ChangeEvent<HTMLInputElement>) {
        const onlyDigits = event.target.value.replace(/\D/g, "");
        const formatted = formatCpf(onlyDigits);
        setCpf(formatted);
        if (onlyDigits.length === 11) {
            setCpfError(isValidCpf(onlyDigits) ? "" : "CPF inválido.");
        } else {
            setCpfError("");
        }
        return formatted;
    }

    function validateCpf(raw: string): string {
        return validateCpfValue(raw);
    }

    return { cpf, cpfError, setCpf, setCpfError, handleCpfChange, validateCpf };
}

export function useCnpjField() {
    const [cnpj, setCnpj] = useState("");
    const [cnpjError, setCnpjError] = useState("");

    function handleCnpjChange(event: React.ChangeEvent<HTMLInputElement>) {
        const onlyDigits = event.target.value.replace(/\D/g, "");
        const formatted = formatCnpj(onlyDigits);
        setCnpj(formatted);
        if (onlyDigits.length === 14) {
            setCnpjError(isValidCnpj(onlyDigits) ? "" : "CNPJ inválido.");
        } else {
            setCnpjError("");
        }
        return formatted;
    }

    function validateCnpj(raw: string): string {
        return validateCnpjValue(raw);
    }

    return { cnpj, cnpjError, setCnpj, setCnpjError, handleCnpjChange, validateCnpj };
}

export function useTelField() {
    const [tel, setTel] = useState("");
    const [telError, setTelError] = useState("");

    function stripMask(value: string) {
        return value.replace(/\D/g, "");
    }

    function formatTel(digits: string): string {
        if (digits.length === 0) return "";
        if (digits.length <= 2) return `(${digits}`;
        if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
        return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
    }

    function isValidTel(digits: string): boolean {
        if (digits.length === 11 && digits[2] === "9") return true;
        return false;
    }

    function handleTelChange(event: React.ChangeEvent<HTMLInputElement>) {
        const onlyDigits = stripMask(event.target.value).slice(0, 11);
        const currentDigits = stripMask(tel);
        if (isValidTel(currentDigits) && onlyDigits.length >= currentDigits.length) return tel;
        const formatted = formatTel(onlyDigits);
        setTel(formatted);
        if (onlyDigits.length === 10 || onlyDigits.length === 11) {
            setTelError(isValidTel(onlyDigits) ? "" : "Telefone inválido.");
        } else {
            setTelError("");
        }
        return formatted;
    }

    function validateTel(raw: string): string {
        return validateTelValue(raw);
    }

    return { tel, telError, setTel, setTelError, handleTelChange, validateTel, stripMask };
}

export function usePasswordField() {
    const [password, setPassword] = useState("");
    const [passwordError, setPasswordError] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [confirmPasswordError, setConfirmPasswordError] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    function validatePassword(value: string): string {
        if (value.length < 8) return "Senha deve ter ao menos 8 caracteres.";
        if (!/[a-z]/.test(value)) return "Deve conter ao menos uma letra minúscula.";
        if (!/[A-Z]/.test(value)) return "Deve conter ao menos uma letra maiúscula.";
        if (!/[0-9]/.test(value)) return "Deve conter ao menos um número.";
        return "";
    }

    function handlePasswordChange(event: React.ChangeEvent<HTMLInputElement>) {
        const value = event.target.value;
        setPassword(value);
        setPasswordError(validatePassword(value));
        if (confirmPassword) {
            setConfirmPasswordError(value !== confirmPassword ? "As senhas não coincidem." : "");
        }
    }

    function handleConfirmPasswordChange(event: React.ChangeEvent<HTMLInputElement>) {
        const value = event.target.value;
        setConfirmPassword(value);
        setConfirmPasswordError(value !== password ? "As senhas não coincidem." : "");
    }

    return {
        password, passwordError, setPasswordError,
        confirmPassword, confirmPasswordError, setConfirmPasswordError,
        showPassword, setShowPassword,
        handlePasswordChange, handleConfirmPasswordChange, validatePassword,
    };
}

export function useEmailField() {
    const [email, setEmail] = useState("");
    const [emailError, setEmailError] = useState("");

    function validateEmail(value: string): string {
        return validateEmailValue(value);
    }

    function handleEmailChange(event: React.ChangeEvent<HTMLInputElement>) {
        const value = event.target.value;
        setEmail(value);
        setEmailError(validateEmail(value));
        return value;
    }

    return { email, emailError, setEmail, setEmailError, handleEmailChange, validateEmail };
}

export const fieldBase = "w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all";
export const fieldError = "border-red-400 focus:border-red-400 focus:ring-red-400/20";
export const field = (hasError: boolean) => `${fieldBase} ${hasError ? fieldError : ""}`;