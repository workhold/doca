export type MessageValues = Record<string, string | number>;

export function lookupTemplate(
  primary: Readonly<Record<string, string>>,
  fallback: Readonly<Record<string, string>>,
  key: string,
  values?: MessageValues,
) {
  let resolved = key;
  if (values && typeof values.count === "number") {
    const form = values.count === 1 ? "one" : "other";
    const plural = `${key}.${form}`;
    if (plural in primary || plural in fallback) resolved = plural;
  }
  return primary[resolved] ?? fallback[resolved] ?? resolved;
}

export function interpolate(template: string, values?: MessageValues) {
  if (!values) return template;
  return template.replace(/\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (token, name: string) => {
    const value = values[name];
    return value === undefined ? token : String(value);
  });
}
