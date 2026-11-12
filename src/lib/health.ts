export type HealthBody = {
  status: "ok" | "degraded";
  checks: {
    database: "ok" | "unavailable";
    vector: "ok" | "missing" | "unknown";
  };
};

export type HealthResult = { httpStatus: 200 | 503; body: HealthBody };

export type HealthProbes = {
  pingDatabase: () => Promise<void>;
  hasVectorExtension: () => Promise<boolean>;
};

/**
 * Runs readiness checks. Failures are reported as states only;
 * driver error messages (which can contain connection strings) are never returned.
 */
export async function checkHealth(probes: HealthProbes): Promise<HealthResult> {
  try {
    await probes.pingDatabase();
  } catch {
    return {
      httpStatus: 503,
      body: { status: "degraded", checks: { database: "unavailable", vector: "unknown" } },
    };
  }

  const vectorReady = await probes.hasVectorExtension().catch(() => false);
  if (!vectorReady) {
    return {
      httpStatus: 503,
      body: { status: "degraded", checks: { database: "ok", vector: "missing" } },
    };
  }

  return { httpStatus: 200, body: { status: "ok", checks: { database: "ok", vector: "ok" } } };
}
