"use client";

import { Button } from "~/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "~/components/ui/carousel";
import { cn } from "~/lib/utils";

export const CategoriesCarousel: React.FC<{
  tags: { id: string; name: string; slug: string }[];
  selectedTagIds: string[];
  onTagSelect: (tagId: string) => void;
}> = ({ tags, selectedTagIds, onTagSelect }) => {
  return (
    <Carousel className="w-full" opts={{ align: "start", loop: false }}>
      <CarouselContent className="-ml-2">
        {tags.map((t) => {
          const isSelected = selectedTagIds.includes(t.id);
          return (
            <CarouselItem className="basis-auto pl-2" key={t.id}>
              <Button
                className={cn(
                  "cursor-pointer rounded-full text-sm",
                  isSelected && "",
                )}
                onClick={() => onTagSelect(t.id)}
                size="sm"
                variant={isSelected ? "secondary" : "outline"}
              >
                {t.name}
              </Button>
            </CarouselItem>
          );
        })}
      </CarouselContent>
    </Carousel>
  );
};
