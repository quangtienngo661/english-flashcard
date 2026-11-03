import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import { TermsVersion, type TermsVersionSource } from '../identity/profile/terms-version.js';
import { LegalService } from './legal.service.js';

/** Identity never imports Legal (D3): it reads the published terms version through the port registered here. */
@Injectable()
export class LegalTermsProvider implements TermsVersionSource, OnModuleInit {
  constructor(
    @Inject(TermsVersion) private readonly terms: TermsVersion,
    @Inject(LegalService) private readonly legal: LegalService,
  ) {}

  onModuleInit(): void {
    this.terms.register(this);
  }

  current(): Promise<string | null> {
    return this.legal.currentTermsVersion();
  }
}
