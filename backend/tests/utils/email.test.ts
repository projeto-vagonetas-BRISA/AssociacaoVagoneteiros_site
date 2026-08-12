import { describe, it, expect, vi, beforeEach } from 'vitest';

// nodemailer será mockado; controlamos o que createTransport retorna
const mockSendMail = vi.fn();
const mockCreateTransport = vi.fn();

vi.mock('nodemailer', () => ({
  default: {
    createTransport: (...args: any[]) => mockCreateTransport(...args),
  },
}));

async function loadEmailModule(env: Record<string, string | undefined>) {
  vi.resetModules();
  const prev = { ...process.env };
  // zera as vars de email pra garantir controle
  delete process.env.EMAIL_USER;
  delete process.env.EMAIL_PASS;
  delete process.env.FRONTEND_URL;
  Object.assign(process.env, env);
  const mod = await import('../../src/utils/email');
  Object.assign(process.env, prev);
  return mod;
}

function mockResolvedTransporter() {
  const resolved = { sendMail: mockSendMail };
  // createTransport retorna o próprio resolved (não-promise)
  mockCreateTransport.mockReturnValue(resolved);
}

beforeEach(() => {
  mockSendMail.mockReset();
  mockCreateTransport.mockReset();
  // default: sem email configurado (transporter null)
  delete process.env.EMAIL_USER;
  delete process.env.EMAIL_PASS;
  delete process.env.FRONTEND_URL;
});

describe('email.ts — enviarEmailResetSenha', () => {
  it('não envia (apenas loga) quando SMTP não está configurado', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const mod = await loadEmailModule({});
    await mod.enviarEmailResetSenha('a@b.com', 'João', 'tok123');
    expect(mockSendMail).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('[EMAIL] SMTP não configurado'),
    );
    logSpy.mockRestore();
  });

  it('envia email de reset com link usando FRONTEND_URL', async () => {
    mockResolvedTransporter();
    mockSendMail.mockImplementation(() => Promise.resolve({ messageId: 'm1' }));
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const mod = await loadEmailModule({
      EMAIL_USER: 'vaga@x.com',
      EMAIL_PASS: 'senha',
      FRONTEND_URL: 'https://vagoneteiros.app',
    });

    await mod.enviarEmailResetSenha('destino@x.com', 'Maria', 'abc123');

    expect(mockCreateTransport).toHaveBeenCalledWith(
      expect.objectContaining({ host: 'smtp.gmail.com', port: 587, auth: { user: 'vaga@x.com', pass: 'senha' } }),
    );
    expect(mockSendMail).toHaveBeenCalledTimes(1);
    const mailArgs = mockSendMail.mock.calls[0][0];
    expect(mailArgs.to).toBe('destino@x.com');
    expect(mailArgs.subject).toContain('Redefinição de Senha');
    expect(mailArgs.html).toContain('https://vagoneteiros.app/redefinir-senha?token=abc123');
    expect(mailArgs.html).toContain('Maria');
    logSpy.mockRestore();
  });

  it('usa localhost:5173 como fallback de FRONTEND_URL', async () => {
    mockResolvedTransporter();
    mockSendMail.mockImplementation(() => Promise.resolve({ messageId: 'm1' }));
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const mod = await loadEmailModule({ EMAIL_USER: 'vaga@x.com', EMAIL_PASS: 'senha' });

    await mod.enviarEmailResetSenha('d@x.com', 'Jo', 'tok');

    expect(mockSendMail.mock.calls[0][0].html).toContain('http://localhost:5173');
    logSpy.mockRestore();
  });

  it('loga erro quando o envio falha', async () => {
    mockResolvedTransporter();
    mockSendMail.mockImplementation(() => Promise.reject(new Error('smtp down')));
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const mod = await loadEmailModule({ EMAIL_USER: 'vaga@x.com', EMAIL_PASS: 'senha' });

    await mod.enviarEmailResetSenha('d@x.com', 'Jo', 'tok');
    // o envio é fire-and-forget (sem await interno) → aguardar microtask
    await new Promise((r) => setTimeout(r, 0));

    expect(errSpy).toHaveBeenCalledWith(expect.stringContaining('[EMAIL] Falha ao enviar'), expect.stringContaining('smtp down'));
    errSpy.mockRestore();
    logSpy.mockRestore();
  });
});

describe('email.ts — enviarEmailConfirmacaoAgendamento', () => {
  it('envia email de confirmação com dados do agendamento', async () => {
    mockResolvedTransporter();
    mockSendMail.mockImplementation(() => Promise.resolve({ messageId: 'm2' }));
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const mod = await loadEmailModule({ EMAIL_USER: 'vaga@x.com', EMAIL_PASS: 'senha' });

    await mod.enviarEmailConfirmacaoAgendamento(
      'd@x.com',
      'Carlos',
      42,
      '2026-12-14',
      '08:00',
      'Passeio de lancha',
    );

    expect(mockSendMail).toHaveBeenCalledTimes(1);
    const mailArgs = mockSendMail.mock.calls[0][0];
    expect(mailArgs.to).toBe('d@x.com');
    expect(mailArgs.subject).toContain('#42');
    expect(mailArgs.html).toContain('Carlos');
    expect(mailArgs.html).toContain('Passeio de lancha');
    expect(mailArgs.html).toContain('08:00');
    logSpy.mockRestore();
  });

  it('não envia quando SMTP não configurado', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const mod = await loadEmailModule({});
    await mod.enviarEmailConfirmacaoAgendamento('d@x.com', 'A', 1, '2026-12-14', '09:00', 'P');
    expect(mockSendMail).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });
});
