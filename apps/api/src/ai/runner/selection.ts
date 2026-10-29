import { Inject, Injectable } from '@nestjs/common';
import type { AiOperation } from '../ai.types.js';
import { LiveConfigReader } from '../configs/live-config.reader.js';
import type { Selection } from './to-selection.js';

// The shape of a selection and how a config becomes one live in `to-selection.ts` (so the live config reader can use it without a cycle).
export { toSelection, type ModelRow, type Selection } from './to-selection.js';

/** The model and settings the operation runs with right now: those of its live config (nhóm B M2). */
@Injectable()
export class SelectionReader {
  constructor(@Inject(LiveConfigReader) private readonly live: LiveConfigReader) {}

  /** Null when the live config has no model (D9). */
  async load(operation: AiOperation): Promise<Selection | null> {
    return (await this.live.load(operation)).selection;
  }
}
