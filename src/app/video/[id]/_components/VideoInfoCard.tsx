"use client";

import { format } from "date-fns";
import { ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CreatorLink } from "~/app/_components/CreatorBadge";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { cn } from "~/lib/utils";

type Creator = {
  id: string;
  username: string;
  displayName: string;
  image: string | null;
};

type Tag = {
  id: string;
  tag: {
    name: string;
  };
};

type VideoInfoCardProps = {
  views: number;
  createdAt: Date;
  mainCreator: Creator | null;
  featuredCreators: Array<{ creator: Creator }>;
  tags: Tag[];
};

const MAX_HEIGHT = 220;

export function VideoInfoCard({
  views,
  createdAt,
  mainCreator,
  featuredCreators,
  tags,
}: VideoInfoCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasOverflow, setHasOverflow] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const formattedViewsCount = new Intl.NumberFormat("en", {
    notation: "compact",
  }).format(views);

  useEffect(() => {
    const checkOverflow = () => {
      if (contentRef.current) {
        const element = contentRef.current;
        setHasOverflow(element.scrollHeight > MAX_HEIGHT);
      }
    };

    checkOverflow();
    // Recheck on window resize
    window.addEventListener("resize", checkOverflow);
    return () => window.removeEventListener("resize", checkOverflow);
  }, []);

  return (
    <Card className="relative m-0 gap-0 p-0 text-sm">
      <p className="m-4 mb-0 flex items-center gap-2 font-medium">
        <span>
          {formattedViewsCount} view{views === 1 ? "" : "s"}
        </span>
        <span>{format(createdAt, "MMM d, yyyy")}</span>
      </p>

      <div
        className={cn(
          `mx-4 mt-4 space-y-2 overflow-hidden`,
          isExpanded ? "mb-10" : "",
          hasOverflow ? "" : "mb-4",
        )}
        ref={contentRef}
        style={{ maxHeight: isExpanded ? undefined : MAX_HEIGHT }}
      >
        {tags.length > 0 && (
          <section className="space-y-1.5">
            <p className="text-muted-foreground text-sm">Tags</p>

            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <Link
                  className="inline-flex items-center gap-2 rounded-full border px-2 py-1 text-xs hover:bg-secondary/80"
                  href={`/tag/${tag.tag.name}`}
                  key={tag.id}
                >
                  {tag.tag.name}
                </Link>
              ))}
            </div>
          </section>
        )}

        {mainCreator && (
          <section className="space-y-1.5">
            <p className="text-muted-foreground text-sm">Video Creator</p>
            <CreatorLink creator={mainCreator} />
          </section>
        )}

        {featuredCreators.length > 0 && (
          <section className="space-y-1.5">
            <p className="text-muted-foreground text-sm">Featuring</p>

            <div className="flex flex-wrap gap-1.5">
              {featuredCreators.map((featuredCreator) => (
                <CreatorLink
                  creator={featuredCreator.creator}
                  key={featuredCreator.creator.id}
                />
              ))}
            </div>
          </section>
        )}
      </div>

      {hasOverflow && (
        <Button
          className="absolute right-0 bottom-0 left-0 w-full rounded-t-none rounded-b-xl bg-linear-to-t from-card to-transparent"
          onClick={() => setIsExpanded(!isExpanded)}
          size="sm"
          variant="ghost"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="mr-1 size-4" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="mr-1 size-4" />
              Show more
            </>
          )}
        </Button>
      )}
    </Card>
  );
}
