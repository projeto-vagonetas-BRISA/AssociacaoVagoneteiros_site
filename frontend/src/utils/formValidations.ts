import { useState } from "react";
import { formatCpf, isValidCpf } from "@brazilian-utils/brazilian-utils";

export function useNameField() {
    const [name, setName] = useState("");
    const [nameError, setNameError] = useState("");

    function validateName(value: string): string {
        const trimmed = value.trim();
        if (trimmed.length < 3) return "Nome deve ter ao menos 3 caracteres.";
        if (!/^[A-Za-zÀ-ÖØ-öø-ÿ\s]+$/.test(trimmed)) return "Nome não pode conter números ou caracteres especiais.";
        if (trimmed.split(/\s+/).length < 2) return "Informe nome e sobrenome.";
        return "";
    }

    function handleNameChange(event: React.ChangeEvent<HTMLInputElement>) {
        const value = event.target.value;
        setName(value);
        setNameError(validateName(value));
    }

    return { name, nameError, setNameError, handleNameChange, validateName };
}

export function useCpfField() {
    const [cpf, setCpf] = useState("");
    const [cpfError, setCpfError] = useState("");

    function handleCpfChange(event: React.ChangeEvent<HTMLInputElement>) {
        const onlyDigits = event.target.value.replace(/\D/g, "");
        setCpf(formatCpf(onlyDigits));
        if (onlyDigits.length === 11) {
            setCpfError(isValidCpf(onlyDigits) ? "" : "CPF inválido.");
        } else {
            setCpfError("");
        }
    }

    function validateCpf(raw: string): string {
        return !isValidCpf(raw) ? "CPF inválido." : "";
    }

    return { cpf, cpfError, setCpfError, handleCpfChange, validateCpf };
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
        if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
        if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
        return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
    }

    function isValidTel(digits: string): boolean {
        if (digits.length === 10) return true;
        if (digits.length === 11 && digits[2] === "9") return true;
        return false;
    }

    function handleTelChange(event: React.ChangeEvent<HTMLInputElement>) {
        const onlyDigits = stripMask(event.target.value).slice(0, 11);
        const currentDigits = stripMask(tel);
        if (isValidTel(currentDigits) && onlyDigits.length >= currentDigits.length) return;
        setTel(formatTel(onlyDigits));
        if (onlyDigits.length === 10 || onlyDigits.length === 11) {
            setTelError(isValidTel(onlyDigits) ? "" : "Telefone inválido.");
        } else {
            setTelError("");
        }
    }

    function validateTel(raw: string): string {
        return !isValidTel(raw) ? "Telefone inválido." : "";
    }

    return { tel, telError, setTelError, handleTelChange, validateTel, stripMask };
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
        if (!value.trim()) return "E-mail é obrigatório.";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) return "E-mail inválido.";
        return "";
    }

    function handleEmailChange(event: React.ChangeEvent<HTMLInputElement>) {
        const value = event.target.value;
        setEmail(value);
        setEmailError(validateEmail(value));
    }

    return { email, emailError, setEmailError, handleEmailChange, validateEmail };
}

export const fieldBase = "w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all";
export const fieldError = "border-red-400 focus:border-red-400 focus:ring-red-400/20";
export const field = (hasError: boolean) => `${fieldBase} ${hasError ? fieldError : ""}`;