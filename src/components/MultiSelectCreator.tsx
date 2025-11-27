"use client";

import { useCombobox, useMultipleSelection } from "downshift";
import { Check, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";

type Creator = {
  id: string;
  username: string;
  displayName: string;
};

type Props = {
  creators: Creator[];
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
};

export function MultiSelectCreator({
  creators,
  values,
  onChange,
  placeholder = "Select creators...",
}: Props) {
  const [inputValue, setInputValue] = useState("");

  // Separate selected values into existing creators and new ones
  const selectedCreators = useMemo(() => {
    return values.map((value) => {
      const creator = creators.find((c) => c.id === value);
      return creator
        ? { ...creator, isNew: false }
        : { id: value, displayName: value, username: value, isNew: true };
    });
  }, [values, creators]);

  // Filter out already selected creators from the list
  const availableCreators = useMemo(() => {
    return creators.filter((c) => !values.includes(c.id));
  }, [creators, values]);

  // Filter available creators based on input
  const filteredCreators = useMemo(() => {
    if (!inputValue) return availableCreators;
    const searchLower = inputValue.toLowerCase();
    return availableCreators.filter(
      (creator) =>
        creator.displayName.toLowerCase().includes(searchLower) ||
        creator.username.toLowerCase().includes(searchLower),
    );
  }, [availableCreators, inputValue]);

  const { getDropdownProps } = useMultipleSelection({
    selectedItems: selectedCreators,
    onStateChange: ({ selectedItems, type }) => {
      switch (type) {
        case useMultipleSelection.stateChangeTypes.SelectedItemKeyDownBackspace:
        case useMultipleSelection.stateChangeTypes.SelectedItemKeyDownDelete:
        case useMultipleSelection.stateChangeTypes.DropdownKeyDownBackspace:
        case useMultipleSelection.stateChangeTypes.FunctionRemoveSelectedItem:
          onChange(selectedItems?.map((item) => item.id) ?? []);
          break;
        default:
          break;
      }
    },
  });

  const {
    isOpen,
    getMenuProps,
    getInputProps,
    highlightedIndex,
    getItemProps,
  } = useCombobox({
    items: filteredCreators,
    itemToString: (item) => item?.displayName ?? "",
    inputValue,
    onInputValueChange: ({ inputValue: newValue }) => {
      setInputValue(newValue ?? "");
    },
    onSelectedItemChange: ({ selectedItem }) => {
      if (selectedItem && !values.includes(selectedItem.id)) {
        onChange([...values, selectedItem.id]);
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
        ) &&
        !values.includes(currentInput.trim())
      ) {
        // User pressed Enter with a value that doesn't match any creator
        onChange([...values, currentInput.trim()]);
        setInputValue("");
      }
    },
    stateReducer: (state, actionAndChanges) => {
      const { changes, type } = actionAndChanges;
      switch (type) {
        case useCombobox.stateChangeTypes.InputKeyDownEnter:
        case useCombobox.stateChangeTypes.ItemClick:
          return {
            ...changes,
            isOpen: true,
            highlightedIndex: state.highlightedIndex,
            inputValue: "",
          };
        default:
          return changes;
      }
    },
  });

  const handleRemove = (valueToRemove: string) => {
    onChange(values.filter((v) => v !== valueToRemove));
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <Input
          {...getInputProps(getDropdownProps({ preventKeyAction: isOpen }))}
          className="w-full"
          placeholder={placeholder}
        />

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
                  )}
                >
                  <Check className="mr-2 size-4 opacity-0" />
                  {creator.displayName} (@{creator.username})
                </li>
              ))
            ))}
        </ul>
      </div>

      {selectedCreators.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedCreators.map((item) => (
            <div
              className="flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-sm"
              key={item.id}
            >
              <span>
                {item.displayName}
                {item.isNew && " (new)"}
              </span>
              <button
                className="ml-1 rounded-sm hover:bg-secondary-foreground/20"
                onClick={() => handleRemove(item.id)}
                type="button"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
