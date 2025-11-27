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
    getMenuProps,
    getInputProps,
    highlightedIndex,
    getItemProps,
    selectedItem,
    openMenu,
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
    stateReducer: (_state, actionAndChanges) => {
      const { changes, type } = actionAndChanges;
      switch (type) {
        case useCombobox.stateChangeTypes.InputBlur:
          return {
            ...changes,
            inputValue: "",
          };
        default:
          return changes;
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
          <div className="relative">
            <Input
              {...getInputProps({
                onFocus: () => {
                  if (!isOpen) {
                    openMenu();
                  }
                },
              })}
              className={cn("w-full pr-8", !isOpen && "cursor-pointer")}
              placeholder={
                isOpen
                  ? "Type to search or create..."
                  : displayValue || placeholder
              }
              readOnly={!isOpen}
              value={isOpen ? inputValue : ""}
            />
            <ChevronsUpDown className="-translate-y-1/2 pointer-events-none absolute top-1/2 right-3 size-4 opacity-50" />
          </div>
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
        {isOpen &&
          (filteredCreators.length === 0 && inputValue ? (
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
          ))}
      </ul>
    </div>
  );
}
