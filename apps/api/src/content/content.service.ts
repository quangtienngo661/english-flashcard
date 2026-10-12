import { Inject, Injectable } from '@nestjs/common';
import { SourcesService, isSourceComplete, type SourceView } from './sources/sources.service.js';

@Injectable()
export class ContentService {
  constructor(@Inject(SourcesService) private readonly sources: SourcesService) {}

  getSource(id: string): Promise<SourceView | null> {
    return this.sources.getSource(id);
  }

  isSourceComplete(source: SourceView): boolean {
    return isSourceComplete(source);
  }
}
