export function isTransientDatabaseFailure(error: unknown) {
  const value = error as { code?: string; message?: string };
  return (
    ["P1001", "P1002", "P2024", "ECONNRESET", "ETIMEDOUT"].includes(
      value.code ?? "",
    ) ||
    /TLS connection|Connection terminated|socket disconnected|Unable to start a transaction|connection pool/i.test(
      value.message ?? "",
    )
  );
}

export async function retryTransientCleanup(
  work: () => Promise<void>,
  attempts = 3,
) {
  for (let attempt = 1; ; attempt += 1) {
    try {
      await work();
      return;
    } catch (error) {
      if (attempt >= attempts || !isTransientDatabaseFailure(error))
        throw error;
      await new Promise((resolve) =>
        setTimeout(resolve, 200 * 2 ** (attempt - 1)),
      );
    }
  }
}
