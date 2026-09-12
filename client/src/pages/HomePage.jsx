import { useEffect, useState } from 'react';
import Hero from '../components/home/Hero';
import FeaturedStays from '../components/home/FeaturedStays';
import DestinationExplorer from '../components/home/DestinationExplorer';
import { TrustBand, ExperiencesPreview, EditorialSplit, FaqBlock, ClosingCta } from '../components/home/HomeSections';
import HotelDiscovery from '../components/hotels/HotelDiscovery';
import { useHotelSearch } from '../hooks/useHotelSearch';
import { useAuth } from '../contexts/AuthContext';
import { setSeo } from '../utils/seo';
import { CURRENCIES } from '../utils/format';
import Segmented from '../components/ui/Segmented';

export default function HomePage() {
  const { user } = useAuth();
  const [currency, setCurrency] = useState(user?.preferences?.currency || 'INR');
  const preview = useHotelSearch({ limit: 3, sync: false });

  useEffect(() => {
    setSeo({
      title: 'Stay somewhere unforgettable',
      description:
        'LUXORA is a curated collection of exceptional hotels, private villas and unforgettable stays in Jaipur, Dubai, Bali, Tokyo, Paris, Santorini and the Maldives — with live rates, verified reviews and one honest total.',
      canonical: 'https://luxora.travel/',
    });
  }, []);

  return (
    <>
      <Hero />

      {/* currency control sits with the first priced section so every figure agrees */}
      <div className="shell flex items-center justify-between gap-4 pt-8">
        <p className="text-[0.6875rem] uppercase tracking-luxe text-muted">Prices in</p>
        <Segmented
          ariaLabel="Display currency"
          size="sm"
          value={currency}
          onChange={setCurrency}
          options={Object.entries(CURRENCIES).map(([key, cfg]) => ({ key, label: cfg.symbol === key ? key : `${cfg.symbol} ${key}` }))}
        />
      </div>

      <FeaturedStays currency={currency} />
      <TrustBand />
      <DestinationExplorer />
      <HotelDiscovery search={preview} preview currency={currency} />
      <ExperiencesPreview />
      <EditorialSplit />
      <FaqBlock />
      <ClosingCta />
    </>
  );
}
