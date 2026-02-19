export function generateId(prefix: string = 'id'): string {
  return `${prefix}_${crypto.randomUUID()}`;
}
