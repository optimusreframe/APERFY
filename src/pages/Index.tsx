import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import HeroSection from '@/components/landing/HeroSection';
import FeaturedSection from '@/components/landing/FeaturedSection';
import HowItWorksSection from '@/components/landing/HowItWorksSection';
import MaterialsSection from '@/components/landing/MaterialsSection';
import StatsSection from '@/components/landing/StatsSection';
import RequestCTASection from '@/components/landing/RequestCTASection';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <FeaturedSection />
      <HowItWorksSection />
      <MaterialsSection />
      <StatsSection />
      <RequestCTASection />
      <Footer />
    </div>
  );
};

export default Index;
