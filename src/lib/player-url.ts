export function buildPlayerProfilePath(params: {
  region?: string | null;
  gameName?: string | null;
  tagLine?: string | null;
}) {
  const { region, gameName, tagLine } = params;

  if (!region || !gameName || !tagLine) {
    return null;
  }

  return `/player/${encodeURIComponent(region)}/${encodeURIComponent(
    gameName,
  )}/${encodeURIComponent(tagLine)}`;
}

export function parseDisplayName(displayName?: string | null): {
  gameName: string | null;
  tagLine: string | null;
} {
  if (!displayName || !displayName.includes('#')) {
    return {
      gameName: null,
      tagLine: null,
    };
  }

  const [gameName, ...tagParts] = displayName.split('#');
  const tagLine = tagParts.join('#');

  if (!gameName || !tagLine) {
    return {
      gameName: null,
      tagLine: null,
    };
  }

  return {
    gameName,
    tagLine,
  };
}