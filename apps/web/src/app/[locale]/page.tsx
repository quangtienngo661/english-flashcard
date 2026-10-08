import { AiPractice } from '@/components/sections/AiPractice';
import { Faq } from '@/components/sections/Faq';
import { FinalCta } from '@/components/sections/FinalCta';
import { Hero } from '@/components/sections/Hero';
import { HowItWorks } from '@/components/sections/HowItWorks';
import { Plans } from '@/components/sections/Plans';
import { Problem } from '@/components/sections/Problem';

export default function HomePage() {
  return (
    <>
      <Hero />
      <Problem />
      <HowItWorks />
      <AiPractice />
      <Plans />
      <Faq />
      <FinalCta />
    </>
  );
}
