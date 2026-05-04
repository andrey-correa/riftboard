import { describe, it, expect } from 'vitest';
import { getPatchFromGameVersion } from '@/lib/patch';

describe('getPatchFromGameVersion', () => {
  it('extrai patch de versão padrão da Riot', () => {
    expect(getPatchFromGameVersion('15.23.702.9214')).toBe('15.23');
    expect(getPatchFromGameVersion('14.1.412.5678')).toBe('14.1');
    expect(getPatchFromGameVersion('14.20.1.1234')).toBe('14.20');
  });

  it('retorna null para entrada nula ou indefinida', () => {
    expect(getPatchFromGameVersion(null)).toBeNull();
    expect(getPatchFromGameVersion(undefined)).toBeNull();
  });

  it('retorna null para string vazia', () => {
    expect(getPatchFromGameVersion('')).toBeNull();
  });

  it('retorna null para versão sem separador suficiente', () => {
    expect(getPatchFromGameVersion('15')).toBeNull();
  });

  it('funciona com versão de apenas dois segmentos', () => {
    expect(getPatchFromGameVersion('14.20')).toBe('14.20');
  });
});
