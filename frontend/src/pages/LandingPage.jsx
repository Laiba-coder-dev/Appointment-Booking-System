import { useEffect } from 'react';
import useGsapReveal from '../hooks/useGsapReveal';
import { useDocumentTitle } from '../hooks/useUtility';
import Hero from '../components/landing/Hero';
import FeaturedServices from '../components/landing/FeaturedServices';
import PopularProfessionals from '../components/landing/PopularProfessionals';
import { HowItWorks, WhyChoose } from '../components/landing/StorySections';
import { StatsSection, TestimonialsSection } from '../components/landing/SocialProof';
import { FAQSection, ContactSection } from '../components/landing/FaqContact';
import CallToAction from '../components/landing/CallToAction';

export default function LandingPage() {
  useDocumentTitle('Your Time. Your Schedule. Your Way.');
  const scope = useGsapReveal();

  useEffect(() => {
    document.body.classList.add('antialiased');
    return () => document.body.classList.remove('antialiased');
  }, []);

  return (
    <div ref={scope} className="bg-ivory">
      <Hero />
      <FeaturedServices />
      <PopularProfessionals />
      <HowItWorks />
      <StatsSection />
      <WhyChoose />
      <TestimonialsSection />
      <FAQSection />
      <CallToAction />
      <ContactSection />
    </div>
  );
}
