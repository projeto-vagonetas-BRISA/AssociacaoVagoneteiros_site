import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useCpfField, useEmailField } from "../utils/formValidations.ts";

interface LoginPopUpProps {
    onClose: () => void;
}

function looksLikeCpf(value: string): boolean {
    const withoutMaskChars = value.replace(/[.\-]/g, "");
    return withoutMaskChars.length === 0 || /^\d+$/.test(withoutMaskChars);
}

export function LoginPopUp({ onClose }: LoginPopUpProps) {

    const popUpRef = useRef<HTMLDivElement>(null);
    const [isMobile, setIsMobile] = useState(() => window.innerWidth < 640); // 640px = Tailwind's `sm`
    const navigate = useNavigate();
    const { login } = useAuth();
    const [visible, setVisible] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCpfMode, setIsCpfMode] = useState(false);
    const cpfField = useCpfField();
    const emailField = useEmailField();

    function handleIdentifierChange(e: React.ChangeEvent<HTMLInputElement>) {
        const isCpf = looksLikeCpf(e.target.value);
        setIsCpfMode(isCpf);
        if (isCpf) {
            cpfField.handleCpfChange(e);
        } else {
            emailField.handleEmailChange(e);
        }
    }

    useEffect(() => {
        const id = requestAnimationFrame(() => setVisible(true));
        return () => cancelAnimationFrame(id);
    }, []);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 640);
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popUpRef.current && !popUpRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        // timeout usado para aguardar o primeiro click ser processado
        const timeoutId = setTimeout(() => {
            document.addEventListener('click', handleClickOutside);
        }, 0);

        return () => {
            clearTimeout(timeoutId);
            document.removeEventListener('click', handleClickOutside);
        };
    }, [onClose]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const form = e.target as HTMLFormElement;
        const formData = new FormData(form);
        const senha = formData.get('password') as string;
        const rawInput = (formData.get('email_cpf') as string) ?? "";

        const submittedIsCpf = looksLikeCpf(rawInput);
        const rawIdentifier = submittedIsCpf ? rawInput.replace(/\D/g, "") : rawInput.trim();

        const newIdentifierError = rawIdentifier === ""
            ? "Informe seu email ou CPF."
            : submittedIsCpf
                ? cpfField.validateCpf(rawIdentifier)
                : emailField.validateEmail(rawIdentifier);

        setIsCpfMode(submittedIsCpf);
        if (submittedIsCpf) {
            cpfField.setCpfError(newIdentifierError);
        } else {
            emailField.setEmailError(newIdentifierError);
        }
        if (newIdentifierError) return;

        setIsSubmitting(true);

        try {
            const loggedUser = await login(rawIdentifier, senha);
            onClose();
            // se for admin ou redator, vai para painel; senão para home
            if (loggedUser.perfil === 'ADMIN' || loggedUser.perfil === 'REDATOR') {
                navigate("/painel-admin");
            } else {
                navigate("/");
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Erro ao fazer login. Tente novamente.';
            setError(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const content = (
        <>
            {/* Fundo escuro — apenas no mobile */}
            {isMobile && (
                <div
                    onClick={onClose}
                    className="fixed inset-0 z-[998] bg-black/60"
                />
            )}

            <div
                ref={popUpRef}
                onClick={(e) => e.stopPropagation()} // Evita que cliques internos borbulhem
                className={`
                    border-blue-light z-[999] flex flex-col justify-start overflow-y-auto overflow-x-hidden
                    rounded-3xl border-1 bg-blue-veryDark/95
                    transition-all duration-300 ease-out
                    ${visible? "opacity-100 scale-100": isMobile ? "opacity-0 scale-95" : "opacity-0 scale-95 translate-y-2" }
                    ${isMobile
                        ? "fixed top-1/2 left-1/2 h-[90vh] max-h-[600px] w-[90vw] max-w-[450px] -translate-x-1/2 -translate-y-1/2 px-6 py-6"
                        : "absolute top-full right-0 mt-2 max-h-[calc(100vh-1rem)] w-[500px] px-8 py-9"
                    }
                `
                }>

                {/* Botão de Fechar (X) */}
                <div className="absolute top-4 right-5
                h-[25px] w-[25px] cursor-pointer
                rounded-full
                bg-white transition-colors duration-150 ease-in-out hover:bg-red"
                onClick={onClose}>
                    <div className="absolute top-[2px] left-[12px] h-[21px] w-[1px] rotate-45 bg-blue-veryDark"></div>
                    <div className="absolute top-[2px] left-[12px] h-[21px] w-[1px] -rotate-45 bg-blue-veryDark"></div>
                </div>

                {/* Conteúdo do Formulário */}
                <div className="mx-auto w-full max-w-sm shrink-0">
                    <div className="mx-auto flex h-30 w-30 items-center justify-center rounded-full bg-white">
                        <img
                            alt="Logo"
                            src="/src/assets/logo.png"
                            className="w-auto object-contain" />
                    </div>
                    <h2 className="mt-6 text-center text-xl font-semibold tracking-tight text-slate-100">
                        Faça login para acessar sua conta
                    </h2>
                    <p className="mt-1 text-center text-sm text-slate-400">
                        Um prazer te ver de novo!
                    </p>
                </div>

                <div className="mx-auto mt-8 w-full max-w-sm shrink-0 overflow-y-auto">
                    <form onSubmit={handleSubmit} className="rounded-2xl px-7 py-8 space-y-5 bg-blue-dark border border-white/[0.08]">
                        <div>
                            <label
                                htmlFor="email_cpf"
                                className="block text-sm font-medium text-slate-400">
                                Email ou CPF
                            </label>
                            <div className="mt-1.5">
                                <input
                                    id="email_cpf"
                                    type="text"
                                    name="email_cpf"
                                    required
                                    autoComplete="username"
                                    maxLength={isCpfMode ? 14 : undefined}
                                    value={isCpfMode ? cpfField.cpf : emailField.email}
                                    onChange={handleIdentifierChange}
                                    placeholder="exemplo@gmail.com"
                                    className="block w-full rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-slate-600 bg-[#0d1117] border border-white/10 focus:outline-none focus:ring-1 focus:border-blue focus:ring-blue transition-colors" />
                            </div>
                            {(isCpfMode ? cpfField.cpfError : emailField.emailError) && (
                                <p className="mt-1.5 text-xs text-red-400">
                                    {isCpfMode ? cpfField.cpfError : emailField.emailError}
                                </p>
                            )}
                        </div>

                        <div>
                            <div className="flex items-center justify-between">
                                <label
                                    htmlFor="password"
                                    className="block text-sm font-medium text-slate-400">
                                    Senha
                                </label>
                                <a href="#" className="text-xs font-medium text-red-dark hover:text-red transition-colors">
                                    Esqueceu sua senha?
                                </a>
                            </div>
                            <div className="mt-1.5">
                                <input
                                    id="password"
                                    type="password"
                                    name="password"
                                    required
                                    autoComplete="current-password"
                                    placeholder="••••••••"
                                    className="block w-full rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-slate-600 bg-[#0d1117] border border-white/10 focus:outline-none focus:ring-1 focus:border-blue focus:ring-blue transition-colors" />
                            </div>
                        </div>

                        {error && (
                            <div className="rounded-lg bg-red-dark/20 border border-red-dark/40 px-4 py-3">
                                <p className="text-sm text-red-300 text-center">{error}</p>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="flex w-full cursor-pointer justify-center rounded-lg bg-red-dark px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue disabled:opacity-60 disabled:cursor-not-allowed">
                            {isSubmitting ? "Entrando..." : "Login"}
                        </button>

                        <div className="pt-4 border-t border-white/10 space-y-3">
                            <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
                                Não tem conta?
                            </p>
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                <button
                                    type="button"
                                    onClick={() => { onClose(); navigate("/cadastro?tipo=usuario"); }}
                                    className="inline-flex w-full items-center justify-center rounded-lg border border-white/10 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-white/5 transition-colors cursor-pointer text-center whitespace-normal break-words">
                                    Cadastrar usuário
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { onClose(); navigate("/cadastro?tipo=empresa"); }}
                                    className="inline-flex w-full items-center justify-center rounded-lg border border-white/10 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-white/5 transition-colors cursor-pointer text-center whitespace-normal break-words">
                                    Cadastrar empresa
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );

    if (isMobile) {
        return createPortal(content, document.body);
    }

    return content;
}