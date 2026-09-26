import { z } from "zod";

const moveBuildPayloadSchema = z.object({
  modules: z.array(z.string()).min(1),
  dependencies: z.array(z.string()),
  digest: z.array(z.number().int().min(0).max(255)),
});

export type MoveBuildPayload = z.infer<typeof moveBuildPayloadSchema>;

export function parseMoveBuildOutput(output: string): MoveBuildPayload {
  const lines = output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (let index = lines.length - 1; index >= 0; index -= 1) {
    try {
      return moveBuildPayloadSchema.parse(JSON.parse(lines[index]!));
    } catch {
      // Compiler diagnostics may precede the final JSON payload.
    }
  }

  throw new Error("Sui Move build output did not contain a publish payload");
}

type CreatedObjectResult = {
  effects?: {
    changedObjects: Array<{
      objectId: string;
      idOperation: string;
      outputState: string;
    }>;
  };
  objectTypes?: Record<string, string>;
};

export type CreatedObject = {
  objectId: string;
  type: string;
};

export function createdObjectsFromResult(
  result: CreatedObjectResult,
): CreatedObject[] {
  if (!result.effects) {
    throw new Error("Transaction result did not include effects");
  }

  return result.effects.changedObjects
    .filter((change) => change.idOperation === "Created")
    .map((change) => ({
      objectId: change.objectId,
      type:
        change.outputState === "PackageWrite"
          ? "package"
          : (result.objectTypes?.[change.objectId] ?? "unknown"),
    }));
}

export function requireCreatedObject(
  objects: CreatedObject[],
  predicate: (object: CreatedObject) => boolean,
  label = "Required object",
): string {
  const object = objects.find(predicate);
  if (!object) {
    throw new Error(`${label} was not created`);
  }
  return object.objectId;
}
