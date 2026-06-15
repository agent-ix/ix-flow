import { mkdir, readdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { InstanceNotFoundError, StateVersionConflictError } from "./errors.js";
import {
  summarizeInstance,
  type InstanceSummary,
  type WorkflowInstance,
} from "./instance.js";

export const DEFAULT_STATE_DIR = ".workflow";

export interface InstanceStore {
  create(instance: WorkflowInstance): Promise<void>;
  get(id: string): Promise<WorkflowInstance>;
  appendAndSave(
    id: string,
    events: WorkflowInstance["events"],
    newState: WorkflowInstance,
    expectedVersion: number,
  ): Promise<void>;
  list(): Promise<InstanceSummary[]>;
}

interface IndexFile {
  instances: InstanceSummary[];
}

export class JsonFileInstanceStore implements InstanceStore {
  constructor(private readonly rootDir: string = DEFAULT_STATE_DIR) {}

  async create(instance: WorkflowInstance): Promise<void> {
    const existing = await this.maybeGet(instance.id);
    if (existing) {
      throw new StateVersionConflictError(
        instance.id,
        0,
        existing.stateVersion,
      );
    }
    await this.writeInstance(instance);
    await this.writeIndex(await this.computeIndex());
  }

  async get(id: string): Promise<WorkflowInstance> {
    const instance = await this.maybeGet(id);
    if (!instance) throw new InstanceNotFoundError(id);
    return instance;
  }

  async appendAndSave(
    id: string,
    events: WorkflowInstance["events"],
    newState: WorkflowInstance,
    expectedVersion: number,
  ): Promise<void> {
    const current = await this.get(id);
    if (current.stateVersion !== expectedVersion) {
      throw new StateVersionConflictError(
        id,
        expectedVersion,
        current.stateVersion,
      );
    }
    const nextState: WorkflowInstance = {
      ...newState,
      id,
      events: [...current.events, ...events],
      stateVersion: expectedVersion + 1,
    };
    await this.writeInstance(nextState);
    await this.writeIndex(await this.computeIndex());
  }

  async list(): Promise<InstanceSummary[]> {
    try {
      const raw = await readFile(this.indexPath(), "utf-8");
      return (JSON.parse(raw) as IndexFile).instances;
    } catch (err) {
      if (isNotFound(err)) return [];
      throw err;
    }
  }

  private async maybeGet(id: string): Promise<WorkflowInstance | undefined> {
    try {
      const raw = await readFile(this.instancePath(id), "utf-8");
      return JSON.parse(raw) as WorkflowInstance;
    } catch (err) {
      if (isNotFound(err)) return undefined;
      throw err;
    }
  }

  private async computeIndex(): Promise<InstanceSummary[]> {
    const instanceIds = await this.listInstanceIds();
    const summaries: InstanceSummary[] = [];
    for (const id of instanceIds) {
      const instance = await this.maybeGet(id);
      if (instance) summaries.push(summarizeInstance(instance));
    }
    return summaries.sort((a, b) => a.id.localeCompare(b.id));
  }

  private async listInstanceIds(): Promise<string[]> {
    try {
      const entries = await readdir(join(this.rootDir, "instances"));
      return entries
        .filter((entry) => entry.endsWith(".json"))
        .map((entry) => entry.slice(0, -".json".length));
    } catch (err) {
      if (isNotFound(err)) return [];
      throw err;
    }
  }

  private async writeInstance(instance: WorkflowInstance): Promise<void> {
    await atomicWriteJson(this.instancePath(instance.id), instance);
  }

  private async writeIndex(instances: InstanceSummary[]): Promise<void> {
    await atomicWriteJson(this.indexPath(), { instances });
  }

  private instancePath(id: string): string {
    return join(this.rootDir, "instances", `${id}.json`);
  }

  private indexPath(): string {
    return join(this.rootDir, "index.json");
  }
}

async function atomicWriteJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const tmpPath = `${path}.tmp.${process.pid}.${Date.now()}`;
  await writeFile(tmpPath, JSON.stringify(value, null, 2) + "\n", {
    mode: 0o600,
  });
  await rename(tmpPath, path);
}

function isNotFound(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    err.code === "ENOENT"
  );
}
