import { useState } from "react";
import { formatCnpj, isValidCnpj } from "@brazilian-utils/brazilian-utils";
import { useEmailField, usePasswordField, field } from "../utils/formValidations";

export function Registration_Empresa() {
    const emailField    = useEmailField();
    const passwordField = usePasswordField();

    const [nomeFantasia, setNomeFantasia] = useState("");
    const [nomeFantasiaError, setNomeFantasiaError] = useState("");

    const [cnpj, setCnpj] = useState("");
    const [cnpjError, setCnpjError] = useState("");

    function validateNomeFantasia(value: string): string {
        return value.trim().length < 3 ? "Nome Fantasia deve ter ao menos 3 caracteres." : "";
    }

    function handleNomeFantasiaChange(event: React.ChangeEvent<HTMLInputElement>) {
        const value = event.target.value;
        setNomeFantasia(value);
        setNomeFantasiaError(validateNomeFantasia(value));
    }

    function handleCnpjChange(event: React.ChangeEvent<HTMLInputElement>) {
        const onlyDigits = event.target.value.replace(/\D/g, "").slice(0, 14);
        setCnpj(formatCnpj(onlyDigits));
        if (onlyDigits.length === 14) {
            setCnpjError(isValidCnpj(onlyDigits) ? "" : "CNPJ inválido.");
        } else {
            setCnpjError("");
        }
    }

    function handleSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
        event.preventDefault();

        const rawCnpj = cnpj.replace(/\D/g, "");

        const newNomeFantasiaError    = validateNomeFantasia(nomeFantasia);
        const newCnpjError            = rawCnpj.length === 0 ? "CNPJ é obrigatório." : rawCnpj.length !== 14 ? "CNPJ deve ter 14 dígitos." : !isValidCnpj(rawCnpj) ? "CNPJ inválido." : "";
        const newEmailError           = emailField.validateEmail(emailField.email);
        const newPasswordError        = passwordField.validatePassword(passwordField.password);
        const newConfirmPasswordError = passwordField.password !== passwordField.confirmPassword ? "As senhas não coincidem." : "";

        setNomeFantasiaError(newNomeFantasiaError);
        setCnpjError(newCnpjError);
        emailField.setEmailError(newEmailError);
        passwordField.setPasswordError(newPasswordError);
        passwordField.setConfirmPasswordError(newConfirmPasswordError);

        if (newNomeFantasiaError || newCnpjError || newEmailError || newPasswordError || newConfirmPasswordError) return;

        console.log("Empresa:", { nomeFantasia, cnpj: rawCnpj, email: emailField.email.trim() });
    }

    return (
        <div className="flex items-stretch rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
            <div className="hidden md:flex md:w-2/5 bg-blue-900 items-center justify-center p-12">
                <div className="text-white text-center">
                    <img className="block mx-auto mb-4" src="/src/assets/icons/traveler-32.png" alt="Ícone de empresa de turismo" />
                    <h2 className="text-3xl font-bold mb-3">Bem-vindo</h2>
                    <p className="text-blue-200 text-sm max-w-xs">Cadastre sua empresa para receber avisos e mensagens promocionais para impulsionar seu negócio!</p>
                </div>
            </div>

            <div className="w-full md:w-3/5 bg-white flex items-center justify-center p-8 md:p-12">
                <div className="w-full max-w-sm">
                    <div className="mb-8">
                        <h1 className="text-2xl font-bold text-gray-900">Cadastro de Empresa</h1>
                        <p className="mt-1 text-sm text-gray-500">Preencha os dados abaixo para se registrar</p>
                    </div>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Nome Fantasia</label>
                            <input
                                type="text" name="nomeFantasia" required autoComplete="organization"
                                value={nomeFantasia} onChange={handleNomeFantasiaChange}
                                placeholder="Minha Empresa"
                                className={field(!!nomeFantasiaError)}
                            />
                            {nomeFantasiaError && <p className="mt-1 text-xs text-red-500">{nomeFantasiaError}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">CNPJ</label>
                            <input
                                type="text" name="cnpj" required autoComplete="off"
                                maxLength={18}
                                value={cnpj} onChange={handleCnpjChange}
                                placeholder="00.000.000/0000-00"
                                className={field(!!cnpjError)}
                            />
                            {cnpjError && <p className="mt-1 text-xs text-red-500">{cnpjError}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">E-mail</label>
                            <input
                                type="email" name="email" required autoComplete="email"
                                value={emailField.email} onChange={emailField.handleEmailChange}
                                placeholder="contato@empresa.com"
                                className={field(!!emailField.emailError)}
                            />
                            {emailField.emailError && <p className="mt-1 text-xs text-red-500">{emailField.emailError}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Senha</label>
                            <div className="relative">
                                <input
                                    type={passwordField.showPassword ? "text" : "password"}
                                    name="password" required autoComplete="new-password"
                                    value={passwordField.password} onChange={passwordField.handlePasswordChange}
                                    className={`${field(!!passwordField.passwordError)} pr-10`}
                                />
                                <button
                                    type="button"
                                    onClick={() => passwordField.setShowPassword(!passwordField.showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
                                >
                                    {passwordField.showPassword
                                        ? <img className="w-4" src="/src/assets/icons/eye-16.png" alt="senha visível" />
                                        : <img className="w-4" src="/src/assets/icons/crossedEye-16.png" alt="senha oculta" />}
                                </button>
                            </div>
                            {passwordField.passwordError && <p className="mt-1 text-xs text-red-500">{passwordField.passwordError}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirmar Senha</label>
                            <input
                                type="password" name="confirmPassword" required autoComplete="new-password"
                                value={passwordField.confirmPassword} onChange={passwordField.handleConfirmPasswordChange}
                                className={field(!!passwordField.confirmPasswordError)}
                            />
                            {passwordField.confirmPasswordError && <p className="mt-1 text-xs text-red-500">{passwordField.confirmPasswordError}</p>}
                        </div>

                        <button type="submit" className="mt-2 w-full flex items-center justify-center gap-2 rounded-xl bg-red-dark hover:bg-red active:scale-[0.98] transition-all px-4 py-3 text-sm font-semibold text-white shadow-md cursor-pointer">
                            Cadastrar Empresa
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}