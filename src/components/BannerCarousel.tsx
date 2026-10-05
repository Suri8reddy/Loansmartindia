import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from "@/components/ui/carousel";
import { ArrowRight } from "lucide-react";
import personalImage from "@/assets/loan-personal.jpg";
import homeImage from "@/assets/loan-home.jpg";
import businessImage from "@/assets/loan-business.jpg";
import consultantImage from "@/assets/why-dsa.jpg";

export type Banner = {
  id?: string;
  title?: string | null;
  subtitle?: string | null;
  image_url?: string | null;
  link_url?: string | null;
  cta_text?: string | null;
  fallbackImage?: string;
};

const fallbackBanners: Banner[] = [
  { title: "Personal loans up to ₹40 lakh", subtitle: "Rates from 10.49% p.a. with approval in 24 hours and zero paperwork hassle.", link_url: "/loans", cta_text: "Check my rate", fallbackImage: personalImage },
  { title: "Home loan balance transfer", subtitle: "Move your existing home loan and save up to ₹8,000 every month on EMI.", link_url: "/loans", cta_text: "Compare offers", fallbackImage: homeImage },
  { title: "Business & MSME funding", subtitle: "Collateral-free working capital for growing businesses — decisions in 48 hours.", link_url: "/apply", cta_text: "Apply now", fallbackImage: businessImage },
  { title: "Talk to a dedicated consultant", subtitle: "One expert handles your file end to end, across 50+ partner banks and NBFCs.", link_url: "/contact", cta_text: "Talk to us", fallbackImage: consultantImage },
];

export function BannerCarousel({ banners }: { banners?: Banner[] | null }) {
  const items: Banner[] = banners && banners.length > 1 ? banners.slice(1) : [];
  const slides = [
    ...items,
    ...fallbackBanners.slice(items.length ? 1 : 0),
  ];

  const [api, setApi] = useState<CarouselApi | null>(null);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!api) return;
    const onSelect = () => setCurrent(api.selectedScrollSnap());
    api.on("select", onSelect);
    const timer = setInterval(() => api.scrollNext(), 5000);
    return () => { clearInterval(timer); api.off("select", onSelect); };
  }, [api]);

  return (
    <section className="container mx-auto px-4 py-12" aria-label="Offers">
      <Carousel setApi={setApi} opts={{ loop: true }}>
        <CarouselContent>
          {slides.map((b, i) => (
            <CarouselItem key={b.id ?? i}>
              <div className="relative flex min-h-72 flex-col justify-end overflow-hidden rounded-lg bg-foreground p-7 md:p-12">
                {(b.image_url || b.fallbackImage) && (
                  <img src={b.image_url || b.fallbackImage} alt="" aria-hidden="true" loading="lazy" width={1024} height={768} className="absolute inset-0 h-full w-full object-cover opacity-70 transition-transform duration-700 hover:scale-105" />
                )}
                <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-foreground/95 via-foreground/65 to-transparent" />
                <div className="relative max-w-2xl">
                  <h3 className="mb-2 text-2xl font-bold text-background md:text-3xl">{b.title}</h3>
                  {b.subtitle && <p className="mb-5 max-w-xl text-background/90">{b.subtitle}</p>}
                  <Button asChild variant="secondary" size="lg">
                    <a href={b.link_url || "/apply"}>{b.cta_text || "Learn more"} <ArrowRight className="h-4 w-4 ml-2" /></a>
                  </Button>
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="hidden md:flex -left-4" />
        <CarouselNext className="hidden md:flex -right-4" />
      </Carousel>
      <div className="flex justify-center gap-2 mt-4">
        {slides.map((_, i) => (
          <button
            key={i}
            aria-label={`Go to banner ${i + 1}`}
            onClick={() => api?.scrollTo(i)}
            className={`h-2 rounded-full transition-all ${i === current ? "w-6 bg-primary" : "w-2 bg-muted-foreground/30"}`}
          />
        ))}
      </div>
    </section>
  );
}
