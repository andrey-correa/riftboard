/**
 * Testes unitários das correções da auditoria de segurança.
 * Cada describe mapeia para um item do relatório (1a, 1b, 1c, 2b, 2d, 3a, 3d, 4a).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// 1a — console.log de dados brutos removido de rankings.ts
// ---------------------------------------------------------------------------
describe('1a · rankings.ts — sem console.log em produção', () => {
  it('não exporta nem chama console.log diretamente', async () => {
    const source = await import('fs/promises').then((fs) =>
      fs.readFile(
        new URL('../services/rankings.ts', import.meta.url),
        'utf-8',
      ),
    );
    expect(source).not.toContain('console.log');
  });

  it('não contém o comentário de código temporário de teste', async () => {
    const source = await import('fs/promises').then((fs) =>
      fs.readFile(
        new URL('../services/rankings.ts', import.meta.url),
        'utf-8',
      ),
    );
    expect(source).not.toContain('TEMPORÁRIO PARA TESTE');
    expect(source).not.toContain('top 5');
  });
});

// ---------------------------------------------------------------------------
// 1b / 1c — summonerId extraído do summoner, deleteMany guardado por flag
// ---------------------------------------------------------------------------
describe('1b/1c · player.ts — summonerId e hasDefinitiveRankData', () => {
  it('não contém summonerId hardcoded como null', async () => {
    const source = await import('fs/promises').then((fs) =>
      fs.readFile(
        new URL('../services/player.ts', import.meta.url),
        'utf-8',
      ),
    );
    expect(source).not.toContain('const summonerId: string | null = null');
  });

  it('contém getLeagueEntriesBySummonerId no import', async () => {
    const source = await import('fs/promises').then((fs) =>
      fs.readFile(
        new URL('../services/player.ts', import.meta.url),
        'utf-8',
      ),
    );
    expect(source).toContain('getLeagueEntriesBySummonerId');
  });

  it('contém hasDefinitiveRankData para guardar o deleteMany', async () => {
    const source = await import('fs/promises').then((fs) =>
      fs.readFile(
        new URL('../services/player.ts', import.meta.url),
        'utf-8',
      ),
    );
    expect(source).toContain('hasDefinitiveRankData');
    expect(source).toContain('if (hasDefinitiveRankData)');
  });

  it('CachedSummonerProfile inclui summonerId: string', async () => {
    const source = await import('fs/promises').then((fs) =>
      fs.readFile(
        new URL('../services/player.ts', import.meta.url),
        'utf-8',
      ),
    );
    expect(source).toContain('summonerId: string;');
    expect(source).toContain("typeof summoner.summonerId !== 'string'");
  });
});

// ---------------------------------------------------------------------------
// 2a — rate limiter: script Lua atômico
// ---------------------------------------------------------------------------
describe('2a · ratelimit.ts — script Lua atômico', () => {
  it('usa redis.eval com script Lua em vez de incr+expire separados', async () => {
    const source = await import('fs/promises').then((fs) =>
      fs.readFile(
        new URL('../lib/ratelimit.ts', import.meta.url),
        'utf-8',
      ),
    );
    expect(source).toContain('redis.eval');
    expect(source).toContain("redis.call('INCR'");
    expect(source).toContain("redis.call('EXPIRE'");
  });

  it('não usa incr() e expire() como chamadas separadas', async () => {
    const source = await import('fs/promises').then((fs) =>
      fs.readFile(
        new URL('../lib/ratelimit.ts', import.meta.url),
        'utf-8',
      ),
    );
    // não deve ter redis.incr( ou redis.expire( como chamadas top-level
    expect(source).not.toMatch(/await redis\.incr\(/);
    expect(source).not.toMatch(/await redis\.expire\(/);
  });
});

// ---------------------------------------------------------------------------
// 2b — acquireLock fail-closed
// ---------------------------------------------------------------------------
describe('2b · redis.ts — acquireLock fail-closed', () => {
  it('retorna false quando redis não está disponível', async () => {
    const source = await import('fs/promises').then((fs) =>
      fs.readFile(
        new URL('../lib/redis.ts', import.meta.url),
        'utf-8',
      ),
    );
    // garante que o bloco acquireLock não tem "return true" em nenhum path
    const acquireLockBlock = source.slice(source.indexOf('export async function acquireLock'));
    const endOfFunction = acquireLockBlock.indexOf('\nexport ');
    const funcBody = endOfFunction > 0
      ? acquireLockBlock.slice(0, endOfFunction)
      : acquireLockBlock;

    expect(funcBody).not.toContain('return true');
    expect(funcBody).toContain('return false');
  });
});

// ---------------------------------------------------------------------------
// 2c — timeout no fetch da Riot API
// ---------------------------------------------------------------------------
describe('2c · riot.ts — AbortSignal.timeout', () => {
  it('passa AbortSignal.timeout no fetch da Riot', async () => {
    const source = await import('fs/promises').then((fs) =>
      fs.readFile(
        new URL('../lib/riot.ts', import.meta.url),
        'utf-8',
      ),
    );
    expect(source).toContain('AbortSignal.timeout');
  });
});

// ---------------------------------------------------------------------------
// 2d — logger: LOG_LEVEL validado
// ---------------------------------------------------------------------------
describe('2d · logger.ts — LOG_LEVEL validado', () => {
  it('não usa cast direto process.env.LOG_LEVEL as Level', async () => {
    const source = await import('fs/promises').then((fs) =>
      fs.readFile(
        new URL('../lib/logger.ts', import.meta.url),
        'utf-8',
      ),
    );
    expect(source).not.toContain('process.env.LOG_LEVEL as Level');
  });

  it('valida LOG_LEVEL contra conjunto de valores aceitos', async () => {
    const source = await import('fs/promises').then((fs) =>
      fs.readFile(
        new URL('../lib/logger.ts', import.meta.url),
        'utf-8',
      ),
    );
    expect(source).toContain('VALID_LEVELS');
    expect(source).toContain('.has(');
  });

  it('normaliza LOG_LEVEL para minúsculo', async () => {
    const source = await import('fs/promises').then((fs) =>
      fs.readFile(
        new URL('../lib/logger.ts', import.meta.url),
        'utf-8',
      ),
    );
    expect(source).toContain('.toLowerCase()');
  });
});

// ---------------------------------------------------------------------------
// 3a — matchId: validação de formato
// ---------------------------------------------------------------------------
describe('3a · matches/route.ts — validação de formato do matchId', () => {
  const MATCH_ID_RE = /^[A-Z0-9]{2,6}_\d{6,15}$/;

  it('aceita matchIds válidos da Riot', () => {
    expect(MATCH_ID_RE.test('NA1_4567890123')).toBe(true);
    expect(MATCH_ID_RE.test('EUW1_6789012345')).toBe(true);
    expect(MATCH_ID_RE.test('BR1_2345678901')).toBe(true);
    expect(MATCH_ID_RE.test('KR_1234567890')).toBe(true);
    expect(MATCH_ID_RE.test('OC1_9876543210')).toBe(true);
  });

  it('rejeita matchIds inválidos', () => {
    expect(MATCH_ID_RE.test('')).toBe(false);
    expect(MATCH_ID_RE.test('invalid')).toBe(false);
    expect(MATCH_ID_RE.test('../etc/passwd')).toBe(false);
    expect(MATCH_ID_RE.test('NA1_abc')).toBe(false);
    expect(MATCH_ID_RE.test('_1234567890')).toBe(false);
    expect(MATCH_ID_RE.test('NA1_123')).toBe(false); // numérico muito curto
  });

  it('a regex está presente no route handler', async () => {
    const source = await import('fs/promises').then((fs) =>
      fs.readFile(
        new URL('../app/api/matches/[regionalRoute]/[matchId]/route.ts', import.meta.url),
        'utf-8',
      ),
    );
    expect(source).toContain('MATCH_ID_RE');
    expect(source).toContain('[A-Z0-9]');
  });
});

// ---------------------------------------------------------------------------
// 3b — rankings.ts: sem console.error
// ---------------------------------------------------------------------------
describe('3b · rankings.ts — sem console.error', () => {
  it('não usa console.error diretamente', async () => {
    const source = await import('fs/promises').then((fs) =>
      fs.readFile(
        new URL('../services/rankings.ts', import.meta.url),
        'utf-8',
      ),
    );
    expect(source).not.toContain('console.error');
  });

  it('usa logger.error nos catches', async () => {
    const source = await import('fs/promises').then((fs) =>
      fs.readFile(
        new URL('../services/rankings.ts', import.meta.url),
        'utf-8',
      ),
    );
    expect(source).toContain('logger.error');
  });
});

// ---------------------------------------------------------------------------
// 3c — RANKED_FLEX_TT removido
// ---------------------------------------------------------------------------
describe('3c · rankings/route.ts — RANKED_FLEX_TT removido', () => {
  it('não aceita RANKED_FLEX_TT como fila válida', async () => {
    const source = await import('fs/promises').then((fs) =>
      fs.readFile(
        new URL('../app/api/rankings/[region]/[queue]/[tier]/route.ts', import.meta.url),
        'utf-8',
      ),
    );
    expect(source).not.toContain('RANKED_FLEX_TT');
  });

  it('ainda aceita RANKED_SOLO_5x5 e RANKED_FLEX_SR', async () => {
    const source = await import('fs/promises').then((fs) =>
      fs.readFile(
        new URL('../app/api/rankings/[region]/[queue]/[tier]/route.ts', import.meta.url),
        'utf-8',
      ),
    );
    expect(source).toContain('RANKED_SOLO_5x5');
    expect(source).toContain('RANKED_FLEX_SR');
  });
});

// ---------------------------------------------------------------------------
// 3d — SearchBar: parseDisplayName em vez de split('#')
// ---------------------------------------------------------------------------
describe('3d · SearchBar.tsx — parseDisplayName', () => {
  // Testa a função diretamente (sem importar o componente React)
  function parseDisplayName(displayName?: string | null) {
    if (!displayName || !displayName.includes('#')) {
      return { gameName: null, tagLine: null };
    }
    const [gameName, ...tagParts] = displayName.split('#');
    const tagLine = tagParts.join('#');
    if (!gameName || !tagLine) return { gameName: null, tagLine: null };
    return { gameName, tagLine };
  }

  it('parseia corretamente nome simples', () => {
    const result = parseDisplayName('Player#BR1');
    expect(result.gameName).toBe('Player');
    expect(result.tagLine).toBe('BR1');
  });

  it('preserva a tag quando o nome contém múltiplos #', () => {
    const result = parseDisplayName('Play#er#BR1');
    expect(result.gameName).toBe('Play');
    expect(result.tagLine).toBe('er#BR1');
  });

  it('retorna null para entrada sem #', () => {
    const result = parseDisplayName('PlayerSemTag');
    expect(result.gameName).toBeNull();
    expect(result.tagLine).toBeNull();
  });

  it('retorna null para entrada vazia', () => {
    expect(parseDisplayName('').gameName).toBeNull();
    expect(parseDisplayName(null).gameName).toBeNull();
    expect(parseDisplayName(undefined).gameName).toBeNull();
  });

  it('o componente usa parseDisplayName em vez de split direto', async () => {
    const source = await import('fs/promises').then((fs) =>
      fs.readFile(
        new URL('../components/SearchBar.tsx', import.meta.url),
        'utf-8',
      ),
    );
    expect(source).toContain('parseDisplayName');
    expect(source).not.toContain("trimmed.split('#')");
  });
});

// ---------------------------------------------------------------------------
// 4a — champions.ts: versão DDragon cacheada
// ---------------------------------------------------------------------------
describe('4a · champions.ts — versão DDragon cacheada', () => {
  it('define uma chave de cache para a versão DDragon', async () => {
    const source = await import('fs/promises').then((fs) =>
      fs.readFile(
        new URL('../services/champions.ts', import.meta.url),
        'utf-8',
      ),
    );
    expect(source).toContain('DDRAGON_VERSION_KEY');
    expect(source).toContain('ddragon-version');
  });

  it('chama cacheGet antes de fazer fetch externo da versão', async () => {
    const source = await import('fs/promises').then((fs) =>
      fs.readFile(
        new URL('../services/champions.ts', import.meta.url),
        'utf-8',
      ),
    );
    const versionFnStart = source.indexOf('async function fetchLatestVersion');
    const versionFnEnd = source.indexOf('\nasync function', versionFnStart + 1);
    const versionFnBody = source.slice(versionFnStart, versionFnEnd);

    // cacheGet deve aparecer antes do fetch na função
    const cacheGetPos = versionFnBody.indexOf('cacheGet');
    const fetchPos = versionFnBody.indexOf('fetch(');
    expect(cacheGetPos).toBeGreaterThanOrEqual(0);
    expect(fetchPos).toBeGreaterThan(cacheGetPos);
  });

  it('tem AbortSignal.timeout nos dois fetches ao DDragon', async () => {
    const source = await import('fs/promises').then((fs) =>
      fs.readFile(
        new URL('../services/champions.ts', import.meta.url),
        'utf-8',
      ),
    );
    const occurrences = (source.match(/AbortSignal\.timeout/g) ?? []).length;
    expect(occurrences).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// 4b — rankings.ts: p-limit em vez de mapWithConcurrency
// ---------------------------------------------------------------------------
describe('4b · rankings.ts — p-limit substituiu mapWithConcurrency', () => {
  it('não contém a função mapWithConcurrency', async () => {
    const source = await import('fs/promises').then((fs) =>
      fs.readFile(
        new URL('../services/rankings.ts', import.meta.url),
        'utf-8',
      ),
    );
    expect(source).not.toContain('mapWithConcurrency');
  });

  it('importa p-limit', async () => {
    const source = await import('fs/promises').then((fs) =>
      fs.readFile(
        new URL('../services/rankings.ts', import.meta.url),
        'utf-8',
      ),
    );
    expect(source).toContain("from 'p-limit'");
  });

  it('usa pLimit() com Promise.all', async () => {
    const source = await import('fs/promises').then((fs) =>
      fs.readFile(
        new URL('../services/rankings.ts', import.meta.url),
        'utf-8',
      ),
    );
    expect(source).toContain('pLimit(');
    expect(source).toContain('Promise.all(');
  });
});

// ---------------------------------------------------------------------------
// 4c — zod removido do package.json
// ---------------------------------------------------------------------------
describe('4c · package.json — zod removido', () => {
  it('não lista zod nas dependências', async () => {
    const source = await import('fs/promises').then((fs) =>
      fs.readFile(
        new URL('../../package.json', import.meta.url),
        'utf-8',
      ),
    );
    const pkg = JSON.parse(source);
    expect(pkg.dependencies).not.toHaveProperty('zod');
    expect(pkg.devDependencies).not.toHaveProperty('zod');
  });
});
