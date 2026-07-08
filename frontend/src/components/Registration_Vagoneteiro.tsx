import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../services/auth";
import { useNameField, useCpfField, useTelField, usePasswordField, field, fieldBase } from "../utils/formValidations";

export function Registration_Vagoneteiro() {
    const nameField     = useNameField();
    const cpfField      = useCpfField();
    const telField      = useTelField();
    const passwordField = usePasswordField();

    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [apiError, setApiError] = useState("");

    const [profileImage, setProfileImage] = useState<string | null>(null);
    const [experience, setExperience] = useState("Menos de 1 ano");
    const [joinDate, setJoinDate] = useState("");
    const [history, setHistory] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => setProfileImage(e.target?.result as string);
            reader.readAsDataURL(file);
        }
    }

    async function handleSubmit(event: React.SyntheticEvent<HTMLFormElement>) {
        event.preventDefault();
        setApiError("");

        const rawCpf      = cpfField.cpf.replace(/\D/g, "");
        const rawTel      = telField.stripMask(telField.tel);
        const nameTrimmed = nameField.name.trim();

        const newNameError            = nameField.validateName(nameTrimmed);
        const newCpfError             = cpfField.validateCpf(rawCpf);
        const newTelError             = telField.validateTel(rawTel);
        const newPasswordError        = passwordField.validatePassword(passwordField.password);
        const newConfirmPasswordError = passwordField.password !== passwordField.confirmPassword ? "As senhas não coincidem." : "";

        nameField.setNameError(newNameError);
        cpfField.setCpfError(newCpfError);
        telField.setTelError(newTelError);
        passwordField.setPasswordError(newPasswordError);
        passwordField.setConfirmPasswordError(newConfirmPasswordError);

        if (newNameError || newCpfError || newTelError || newPasswordError || newConfirmPasswordError) return;

        setLoading(true);
        try {
            await authService.createOnly({
                name: nameTrimmed,
                cpf: rawCpf,
                telefone: rawTel,
                senha: passwordField.password,
                historico: history || undefined,
                experiencia: experience,
                data_associacao: joinDate ? new Date(joinDate + 'T12:00:00-03:00').toISOString() : undefined,
                foto: profileImage || undefined,
            });
            navigate("/painel-admin");
        } catch (err: any) {
            setApiError(err instanceof Error ? err.message : 'Erro ao cadastrar vagoneteiro');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="w-full">
            <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    <div className="lg:col-span-2 space-y-5">
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                            <div className="flex items-center gap-3 mb-5">
                                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                                    <img className="w-4" src="/src/assets/icons/user-24.png" alt="Ícone de usuário" />
                                </div>
                                <h2 className="font-semibold text-gray-900">Informações Pessoais</h2>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Nome completo</label>
                                    <input
                                        type="text" name="name" required autoComplete="name"
                                        value={nameField.name} onChange={nameField.handleNameChange}
                                        placeholder="Antônio Silva"
                                        className={field(!!nameField.nameError)}
                                    />
                                    {nameField.nameError && <p className="mt-1 text-xs text-red-500">{nameField.nameError}</p>}
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                            <div className="flex items-center gap-3 mb-5">
                                <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center text-green-600 text-sm">
                                    <img className="w-4" src="/src/assets/icons/briefcase-24.png" alt="Ícone de uma pasta" />
                                </div>
                                <h2 className="font-semibold text-gray-900">Informações Profissionais</h2>
                            </div>
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Tempo de Experiência</label>
                                        <select value={experience} onChange={(e) => setExperience(e.target.value)} className={fieldBase}>
                                            <option>Menos de 1 ano</option>
                                            <option>1 a 3 anos</option>
                                            <option>3 a 5 anos</option>
                                            <option>5 a 10 anos</option>
                                            <option>Mais de 10 anos</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Data de Ingresso na Associação</label>
                                        <input
                                            required type="date"
                                            value={joinDate} onChange={(e) => setJoinDate(e.target.value)}
                                            className={fieldBase}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Histórico</label>
                                    <textarea
                                        value={history} onChange={(e) => setHistory(e.target.value)}
                                        placeholder="Descreva brevemente a história e experiência do vagoneteiro..."
                                        rows={4}
                                        className={`${fieldBase} resize-none`}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-5">
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                            <h2 className="font-semibold text-gray-900 mb-5">Foto de Perfil</h2>
                            <div className="flex flex-col items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-32 h-32 rounded-full border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-1 hover:border-blue-400 hover:bg-blue-50 transition-all cursor-pointer overflow-hidden"
                                >
                                    {profileImage ? (
                                        <img src={profileImage} alt="Perfil" className="w-full h-full object-cover" />
                                    ) : (
                                        <>
                                            <span className="text-2xl text-gray-400">
                                                <img src="/src/assets/icons/camera-24.png" alt="câmera" />
                                            </span>
                                            <span className="text-xs text-gray-400 font-medium">Upload</span>
                                        </>
                                    )}
                                </button>
                                <input ref={fileInputRef} type="file" accept="image/jpg,image/png" onChange={handleImageUpload} className="hidden" />
                                <p className="text-xs text-gray-400 text-center">Recomendado: JPG ou PNG, mín. 400×400px</p>
                            </div>
                        </div>

                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                            <div className="flex items-center gap-3 mb-5">
                                <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center text-red-500 text-sm">
                                    <img className="w-4" src="/src/assets/icons/lock-24.png" alt="cadeado" />
                                </div>
                                <h2 className="font-semibold text-gray-900">Segurança</h2>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Criação de senha</label>
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
                            </div>
                        </div>

                        {apiError && (
                            <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-lg p-3 mb-3">{apiError}</p>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-red-dark hover:bg-red disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-all px-4 py-4 text-sm font-semibold text-white shadow-md cursor-pointer"
                        >
                            {loading ? (
                                <><span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> Cadastrando...</>
                            ) : (
                                "Finalizar Cadastro"
                            )}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}