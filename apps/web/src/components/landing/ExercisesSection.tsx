import { Container } from '@/components/ui/Container';
import type { AppCopy, LandingCopy } from './copy';
import { ExerciseGallery } from './exercises/ExerciseGallery';

// "Nhiều dạng bài luyện tập": the lead, the gallery of seven kinds, and the one rule about AI.
export function ExercisesSection({ copy, kinds }: { copy: LandingCopy['exercises']; kinds: AppCopy['kinds'] }) {
  return (
    <section id="bai-tap" aria-labelledby="exercises-title" className="scroll-mt-16 bg-canvas py-14 md:py-24">
      <Container className="flex flex-col gap-8">
        <div className="flex flex-col gap-3">
          <h2 id="exercises-title" className="text-h2 font-extrabold text-balance text-ink">
            {copy.title}
          </h2>
          <p className="text-lead text-ink">{copy.lead}</p>
        </div>
        <ExerciseGallery copy={copy} kinds={kinds} />
        <p className="max-w-prose text-body-lg font-semibold text-ink">{copy.rule}</p>
      </Container>
    </section>
  );
}
