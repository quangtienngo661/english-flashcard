import { Inject, Injectable } from '@nestjs/common';
import { APP_CONFIG, type AppConfig } from '../../common/config/app-config.js';

/** Registered by Legal: Identity never imports Legal (D3), so it asks for the published terms version through this port. */
export interface TermsVersionSource {
  /** The version of the published legal documents, or `null` while none is published. */
  current(): Promise<string | null>;
}

/**
 * The terms version a learner accepts. Once an admin has published the Privacy Policy and the Terms of Use it is that version;
 * until then it is the `TERMS_VERSION` of the environment. A failing source is not hidden: a sign-up must not record a wrong version.
 */
@Injectable()
export class TermsVersion {
  private source: TermsVersionSource | null = null;

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  register(source: TermsVersionSource): void {
    this.source = source;
  }

  async current(): Promise<string> {
    return (await this.source?.current()) ?? this.config.termsVersion;
  }

  /** True when the learner accepted some version, and it is not the current one (a first acceptance is a different prompt). */
  async outdated(acceptedAt: Date | null, acceptedVersion: string | null): Promise<boolean> {
    return acceptedAt !== null && acceptedVersion !== (await this.current());
  }
}
