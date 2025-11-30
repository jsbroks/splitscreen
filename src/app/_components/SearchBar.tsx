"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useQueryState } from "nuqs";
import { useState } from "react";
import { Input } from "~/components/ui/input";

export const SearchBar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useQueryState("q");
  const [search, setSearch] = useState(searchQuery ?? "");
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const trimmedSearch = search?.trim() ?? "";

    if (pathname !== "/search") {
      // Navigate to search page with query parameter
      router.push(`/search?q=${encodeURIComponent(trimmedSearch)}`);
    } else {
      // Already on search page, just update the query parameter
      setSearchQuery(trimmedSearch);
    }
  };
  return (
    <div className="mx-4 max-w-md flex-1">
      <form className="relative" onSubmit={handleSubmit}>
        <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
        <Input
          className="w-full pl-10"
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search..."
          type="search"
          value={search}
        />
      </form>
    </div>
  );
};
