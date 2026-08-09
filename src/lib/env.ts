export function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.trim() === "") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function numberEnv(name: string, fallback?: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") {
    if (fallback !== undefined) {
      return fallback;
    }
    throw new Error(`Missing required numeric environment variable: ${name}`);
  }

  const value = Number(raw);
  if (!Number.isFinite(value)) {
    throw new Error(`Environment variable ${name} must be a finite number`);
  }
  return value;
}

export function optionalNumberEnv(name: string): number | null {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") {
    return null;
  }
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    throw new Error(`Environment variable ${name} must be a finite number`);
  }
  return value;
}

export function thresholdListEnv(name: string): number[] {
  const raw = requireEnv(name);
  const values = raw
    .split(",")
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isFinite(value) && value > 0 && value < 100);

  const unique = [...new Set(values)].sort((a, b) => a - b);
  if (unique.length === 0) {
    throw new Error(
      `${name} must contain at least one percentage between 0 and 100`,
    );
  }
  return unique;
}
