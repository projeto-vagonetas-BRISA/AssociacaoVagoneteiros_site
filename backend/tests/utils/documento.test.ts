import { describe, it, expect } from 'vitest';
import { cleanCPF, isValidCPF, isValidEmail } from '../../src/utils/documento';

describe('utils/documento', () => {
  describe('cleanCPF', () => {
    it('remove pontuação e espaços', () => {
      expect(cleanCPF('123.456.789-09')).toBe('12345678909');
    });

    it('remove letras e símbolos', () => {
      expect(cleanCPF('(11) 9 8765-4321')).toBe('11987654321');
    });

    it('mantém apenas dígitos', () => {
      expect(cleanCPF('abc123xyz')).toBe('123');
    });

    it('retorna string vazia para entrada sem dígitos', () => {
      expect(cleanCPF('cpf: ---')).toBe('');
    });
  });

  describe('isValidCPF', () => {
    it('aceita CPF com 11 dígitos (com formatação)', () => {
      expect(isValidCPF('123.456.789-09')).toBe(true);
    });

    it('aceita CPF com 11 dígitos (sem formatação)', () => {
      expect(isValidCPF('12345678909')).toBe(true);
    });

    it('rejeita CPF com menos de 11 dígitos', () => {
      expect(isValidCPF('1234567890')).toBe(false);
    });

    it('rejeita CPF com mais de 11 dígitos', () => {
      expect(isValidCPF('123456789091')).toBe(false);
    });

    it('rejeita vazio', () => {
      expect(isValidCPF('')).toBe(false);
    });
  });

  describe('isValidEmail', () => {
    it('aceita email simples e válido', () => {
      expect(isValidEmail('joao@example.com')).toBe(true);
    });

    it('aceita email com subdomínio', () => {
      expect(isValidEmail('joao@mail.example.com.br')).toBe(true);
    });

    it('rejeita email sem @', () => {
      expect(isValidEmail('joaoexample.com')).toBe(false);
    });

    it('rejeita email sem domínio', () => {
      expect(isValidEmail('joao@')).toBe(false);
    });

    it('rejeita email sem tld', () => {
      expect(isValidEmail('joao@example')).toBe(false);
    });

    it('rejeita email com espaços', () => {
      expect(isValidEmail('jo ao@example.com')).toBe(false);
    });

    it('rejeita string vazia', () => {
      expect(isValidEmail('')).toBe(false);
    });
  });
});
