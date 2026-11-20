import { Container } from '../layout/Container';
import type { LandingCopy } from './copy';
import { Glow, SectionHead } from './parts';
import { TopicCarousel } from './TopicCarousel';

export function GroupsSection({ copy }: { copy: LandingCopy['groups'] }) {
  return (
    <section id="nhom-tu" aria-labelledby="nhom-tu-title" className="relative isolate scroll-mt-15 overflow-x-clip md:scroll-mt-17">
      <Glow tone="accent" className="top-45 left-1/2 -ml-130 h-132 w-204" />
      <Glow tone="mark" className="top-75 left-1/2 ml-10 h-114 w-168" />
      <Container className="flex flex-col items-center gap-8 pt-12 pb-10 md:gap-11 md:pt-16 md:pb-12">
        <SectionHead id="nhom-tu-title" title={copy.title} lead={copy.lead} />
        <TopicCarousel copy={copy} />
      </Container>
    </section>
  );
}
