"use client";

import { useCombobox } from "downshift";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";

type Creator = {
  id: string;
  username: string;
  displayName: string;
};

type Props = {
  creators: Creator[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export function SingleSelectCreator({
  creators,
  value,
  onChange,
  placeholder = "Select a creator...",
}: Props) {
  const [inputValue, setInputValue] = useState("");

  // Check if current value is an existing creator or a new one
  const selectedCreator = creators.find((c) => c.id === value);
  const isNewCreator = value && !selectedCreator;

  // Filter creators based on input
  const filteredCreators = useMemo(() => {
    if (!inputValue) return creators;
    const searchLower = inputValue.toLowerCase();
    return creators.filter(
      (creator) =>
        creator.displayName.toLowerCase().includes(searchLower) ||
        creator.username.toLowerCase().includes(searchLower),
    );
  }, [creators, inputValue]);

  const {
    isOpen,
    getToggleButtonProps,
    getMenuProps,
    getInputProps,
    highlightedIndex,
    getItemProps,
    selectedItem,
  } = useCombobox({
    items: filteredCreators,
    itemToString: (item) => item?.displayName ?? "",
    selectedItem: selectedCreator ?? null,
    inputValue,
    onInputValueChange: ({ inputValue: newValue }) => {
      setInputValue(newValue ?? "");
    },
    onSelectedItemChange: ({ selectedItem }) => {
      if (selectedItem) {
        onChange(selectedItem.id);
        setInputValue("");
      }
    },
    // Allow creating new items by pressing Enter
    onIsOpenChange: ({ isOpen: newIsOpen, inputValue: currentInput }) => {
      if (
        !newIsOpen &&
        currentInput &&
        currentInput.trim() &&
        !filteredCreators.find(
          (c) =>
            c.displayName.toLowerCase() === currentInput.toLowerCase().trim(),
        )
      ) {
        // User pressed Enter with a value that doesn't match any creator
        onChange(currentInput.trim());
        setInputValue("");
      }
    },
  });

  const handleClear = () => {
    onChange("");
    setInputValue("");
  };

  const displayValue = selectedCreator
    ? `${selectedCreator.displayName} (@${selectedCreator.username})`
    : isNewCreator
      ? `${value} (new)`
      : "";

  return (
    <div className="relative">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Button
            role="combobox"
            type="button"
            variant="outline"
            {...getToggleButtonProps()}
            className="w-full justify-between"
          >
            <span className={cn(!displayValue && "text-muted-foreground")}>
              {displayValue || placeholder}
            </span>
            <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
          </Button>
        </div>
        {value && (
          <Button
            onClick={handleClear}
            size="icon"
            type="button"
            variant="outline"
          >
            <X className="size-4" />
          </Button>
        )}
      </div>

      <ul
        {...getMenuProps()}
        className={cn(
          "absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md",
          !isOpen && "hidden",
        )}
      >
        {isOpen && (
          <>
            <div className="px-2 py-1.5">
              <Input
                {...getInputProps()}
                className="h-8"
                placeholder="Type to search or create..."
              />
            </div>
            {filteredCreators.length === 0 && inputValue ? (
              <li className="px-2 py-6 text-center text-sm">
                Press Enter to create "{inputValue}"
              </li>
            ) : (
              filteredCreators.map((creator, index) => (
                <li
                  key={creator.id}
                  {...getItemProps({ item: creator, index })}
                  className={cn(
                    "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none",
                    highlightedIndex === index &&
                      "bg-accent text-accent-foreground",
                    selectedItem?.id === creator.id && "bg-accent",
                  )}
                >
                  <Check
                    className={cn(
                      "mr-2 size-4",
                      selectedItem?.id === creator.id
                        ? "opacity-100"
                        : "opacity-0",
                    )}
                  />
                  {creator.displayName} (@{creator.username})
                </li>
              ))
            )}
          </>
        )}
      </ul>
    </div>
  );
}
