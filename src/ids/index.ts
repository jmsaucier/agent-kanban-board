const SHORT_ID_CHARSET = "abcdefghijklmnopqrstuvwxyz0123456789";

export function generateShortSuffix(): string {
  const length = Math.random() < 0.5 ? 5 : 6;
  let suffix = "";
  for (let i = 0; i < length; i++) {
    const index = Math.floor(Math.random() * SHORT_ID_CHARSET.length);
    suffix += SHORT_ID_CHARSET[index];
  }
  return suffix;
}

export function composeItemId(boardId: string, suffix: string): string {
  return `${boardId}-${suffix}`;
}

export function generateUniqueItemId(
  boardId: string,
  existingIds: Set<string>,
): string {
  for (;;) {
    const id = composeItemId(boardId, generateShortSuffix());
    if (!existingIds.has(id)) {
      return id;
    }
  }
}
