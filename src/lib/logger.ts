type LogFields = Record<string, unknown>;

function write(level: "INFO" | "WARN" | "ERROR", message: string, fields: LogFields = {}): void {
  const output = JSON.stringify({
    level,
    message,
    timestamp: new Date().toISOString(),
    ...fields,
  });

  if (level === "ERROR") {
    console.error(output);
  } else if (level === "WARN") {
    console.warn(output);
  } else {
    console.log(output);
  }
}

export const logger = {
  info(message: string, fields?: LogFields): void {
    write("INFO", message, fields);
  },
  warn(message: string, fields?: LogFields): void {
    write("WARN", message, fields);
  },
  error(message: string, fields?: LogFields): void {
    write("ERROR", message, fields);
  },
};
