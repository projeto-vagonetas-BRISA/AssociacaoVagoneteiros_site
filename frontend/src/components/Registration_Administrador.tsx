import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useNameField, useCpfField, useTelField, useEmailField, usePasswordField, field } from "../utils/formValidations";
import { authService } from "../services/auth";

export function Registration_Administrador() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [apiError, setApiError] = useState("");

    const nameField     = useNameField();
    const cpfField      = useCpfField();
    const telField      = useTelField();
    const emailField    = useEmailField();
    const passwordField = usePasswordField();

    async function handleSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
        event.preventDefault();
        setApiError("");

        const rawCpf      = cpfField.cpf.replace(/\D/g, "");
        const rawTel      = telField.stripMask(telField.tel);
        const nameTrimmed = nameField.name.trim();

        const newNameError            = nameField.validateName(nameTrimmed);
        const newCpfError             = cpfField.validateCpf(rawCpf);
        const newTelError             = telField.validateTel(rawTel);
        const newEmailError           = emailField.validateEmail(emailField.email);
        const newPasswordError        = passwordField.validatePassword(passwordField.password);
        const newConfirmPasswordError = passwordField.password !== passwordField.confirmPassword ? "As senhas não coincidem." : "";

        nameField.setNameError(newNameError);
        cpfField.setCpfError(newCpfError);
        telField.setTelError(newTelError);
        emailField.setEmailError(newEmailError);
        passwordField.setPasswordError(newPasswordError);
        passwordField.setConfirmPasswordError(newConfirmPasswordError);

        if (newNameError || newCpfError || newTelError || newEmailError || newPasswordError || newConfirmPasswordError) return;

        setLoading(true);
        try {
            await authService.createAdmin({
                name: nameTrimmed,
                cpf: rawCpf,
                senha: passwordField.password,
                email: emailField.email.trim(),
                telefone: rawTel,
            });
            navigate("/painel-admin");
        } catch (err: any) {
            setApiError(err instanceof Error ? err.message : "Erro ao cadastrar administrador");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="flex items-stretch rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
            <div className="w-full md:w-3/5 bg-white flex items-center justify-center p-8 md:p-12">
                <div className="w-full max-w-sm">
                    <div className="mb-8">
                        <h1 className="text-2xl font-bold text-gray-900">Novo Administrador</h1>
                        <p className="mt-1 text-sm text-gray-500">Preencha os dados abaixo para cadastrar</p>
                    </div>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Nome completo</label>
                            <input
                                type="text" name="name" required autoComplete="name"
                                value={nameField.name} onChange={nameField.handleNameChange}
                                placeholder="António Silva"
                                className={field(!!nameField.nameError)}
                            />
                            {nameField.nameError && <p className="mt-1 text-xs text-red-500">{nameField.nameError}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">CPF</label>
                            <input
                                type="text" name="cpf" required autoComplete="off"
                                maxLength={14}
                                value={cpfField.cpf} onChange={cpfField.handleCpfChange}
                                placeholder="000.000.000-00"
                                className={field(!!cpfField.cpfError)}
                            />
                            {cpfField.cpfError && <p className="mt-1 text-xs text-red-500">{cpfField.cpfError}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Telefone</label>
                            <input
                                type="tel" name="tel" required autoComplete="off"
                                value={telField.tel} onChange={telField.handleTelChange}
                                placeholder="(00) 00000-0000"
                                className={field(!!telField.telError)}
                            />
                            {telField.telError && <p className="mt-1 text-xs text-red-500">{telField.telError}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">E-mail</label>
                            <input
                                type="email" name="email" required autoComplete="email"
                                value={emailField.email} onChange={emailField.handleEmailChange}
                                placeholder="admin@email.com"
                                className={field(!!emailField.emailError)}
                            />
                            {emailField.emailError && <p className="mt-1 text-xs text-red-500">{emailField.emailError}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Senha</label>
                            <div className="relative">
                                <input
                                    id="password" type={passwordField.showPassword ? "text" : "password"}
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
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirmar senha</label>
                            <input
                                type="password" name="confirmPassword" required autoComplete="new-password"
                                value={passwordField.confirmPassword} onChange={passwordField.handleConfirmPasswordChange}
                                className={field(!!passwordField.confirmPasswordError)}
                            />
                            {passwordField.confirmPasswordError && <p className="mt-1 text-xs text-red-500">{passwordField.confirmPasswordError}</p>}
                        </div>

                        {apiError && (
                            <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg p-3">{apiError}</p>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="mt-2 w-full flex items-center justify-center gap-2 rounded-xl bg-red-dark hover:bg-red disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-all px-4 py-3 text-sm font-semibold text-white shadow-md cursor-pointer"
                        >
                            {loading ? (
                                <><span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> Cadastrando...</>
                            ) : (
                                "Finalizar Cadastro"
                            )}
                        </button>
                    </form>
                </div>
            </div>

            <div className="hidden md:flex md:w-2/5 bg-blue-900 items-center justify-center p-12">
                <div className="text-white text-center">
                    <img className="block mx-auto mb-4" src="/src/assets/icons/userAdm-32.png" alt="Ícone de administrador" />
                    <h2 className="text-3xl font-bold mb-3">Área Admin</h2>
                    <p className="text-blue-200 text-sm max-w-xs">Cadastre um administrador para gerenciar o sistema</p>
                </div>
            </div>
        </div>
    );
}