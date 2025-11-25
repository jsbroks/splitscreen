"use client";

import Link from "next/link";

import { Badge } from "~/components/ui/badge";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "~/components/ui/carousel";

const categories = [
  { name: "All", href: "/category/all" },
  { name: "PMV", href: "/category/pmv" },
  { name: "Cute vs Slut", href: "/category/cute-vs-slut" },
  { name: "Split View", href: "/category/split-view" },
  { name: "TikTok", href: "/category/tiktok-views" },
];

export const CategoriesCarousel: React.FC = () => {
  return (
    <Carousel className="w-full" opts={{ align: "start", loop: false }}>
      <CarouselContent className="-ml-2">
        {categories.map((category) => (
          <CarouselItem className="basis-auto pl-2" key={category.href}>
            <Badge asChild className="cursor-pointer text-sm" variant="outline">
              <Link href={category.href}>{category.name}</Link>
            </Badge>
          </CarouselItem>
        ))}
      </CarouselContent>
    </Carousel>
  );
};
