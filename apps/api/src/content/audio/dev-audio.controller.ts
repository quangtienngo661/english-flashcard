import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Controller, Get, Inject, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { APP_CONFIG, type AppConfig } from '../../common/config/app-config.js';
import { ProblemDetailsException } from '../../common/problem-details/problem-details.exception.js';
import { Public } from '../../identity/sessions/public.decorator.js';
import { audioObjectKey } from './audio-storage.js';

const FILE = /^([a-f0-9]{64})\.mp3$/;
const notFound = () => new ProblemDetailsException({ status: 404, title: 'Not found', type: 'not-found' });

/**
 * Plays the local fake storage's files (H16), like the fake Google and payOS pages: it exists only while `AUDIO_STORAGE_FAKE_ENABLED`; any
 * other mode answers 404 as if the route were absent. Only `<64 hex>.mp3` is served, so no path can leave the folder.
 */
@Controller('dev/audio')
export class DevAudioController {
  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  @Get(':file')
  @Public()
  async read(@Param('file') file: string, @Res() res: Response): Promise<void> {
    if (this.config.audio.storage !== 'local') throw notFound();
    const match = FILE.exec(file);
    if (!match) throw notFound();
    let body: Buffer;
    try {
      body = await readFile(join(this.config.audio.localDir, audioObjectKey(match[1])));
    } catch {
      throw notFound();
    }
    res.type('audio/mpeg').status(200).send(body);
  }
}
