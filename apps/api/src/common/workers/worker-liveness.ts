import { Injectable } from '@nestjs/common';

export type RunningProbe = { isRunning(): boolean };

/** Tracks BullMQ workers registered in this process so the worker heartbeat stops if any worker exits. */
@Injectable()
export class WorkerLiveness {
  private readonly workers = new Map<string, RunningProbe>();

  register(name: string, worker: RunningProbe): void {
    this.workers.set(name, worker);
  }

  notRunning(): string[] {
    const dead: string[] = [];
    for (const [name, worker] of this.workers) {
      if (!worker.isRunning()) dead.push(name);
    }
    return dead;
  }
}
