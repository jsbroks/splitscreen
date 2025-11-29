"use client";

import { Search } from "lucide-react";
import { useQueryState } from "nuqs";
import { useState } from "react";
import { Input } from "~/components/ui/input";

export const SearchBar = () => {
  const [searchQuery, setSearchQuery] = useQueryState("q");
  const [search, setSearch] = useState(searchQuery ?? "");
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSearchQuery(search?.trim() ?? "");
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
