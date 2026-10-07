import en from './en.json';

type NestedKeyOf<ObjectType extends object> = {
  [Key in keyof ObjectType & (string | number)]: ObjectType[Key] extends object
    ? `${Key}.${NestedKeyOf<ObjectType[Key]>}`
    : `${Key}`;
}[keyof ObjectType & (string | number)];

export type TranslationKey = NestedKeyOf<typeof en>;

export function t(key: TranslationKey, fallback?: string): string {
  const parts = key.split('.');
  let current: unknown = en;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return fallback ?? key;
    }
  }
  return typeof current === 'string' ? current : fallback ?? key;
}

export function useI18n() {
  return { t };
}
