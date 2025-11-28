"use client";

import { useCombobox, useMultipleSelection } from "downshift";
import { Check, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Input } from "~/components/ui/input";
import { cn } from "~/lib/utils";

type Tag = {
  id: string;
  name: string;
  slug: string;
};

type Props = {
  tags: Tag[];
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
};

export function MultiSelectTag({
  tags,
  values,
  onChange,
  placeholder = "Select tags...",
}: Props) {
  const [inputValue, setInputValue] = useState("");
  const pendingNewTagRef = useRef<string | null>(null);

  // Separate selected values into existing tags and new ones
  const selectedTags = useMemo(() => {
    return values.map((value) => {
      const tag = tags.find((t) => t.id === value);
      return tag
        ? { ...tag, isNew: false }
        : { id: value, name: value, slug: value, isNew: true };
    });
  }, [values, tags]);

  // Filter out already selected tags from the list
  const availableTags = useMemo(() => {
    return tags.filter((t) => !values.includes(t.id));
  }, [tags, values]);

  // Filter available tags based on input
  const filteredTags = useMemo(() => {
    if (!inputValue) return availableTags;
    const searchLower = inputValue.toLowerCase();
    return availableTags.filter((tag) =>
      tag.name.toLowerCase().includes(searchLower),
    );
  }, [availableTags, inputValue]);

  const { getDropdownProps } = useMultipleSelection({
    selectedItems: selectedTags,
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
    items: filteredTags,
    itemToString: (item) => item?.name ?? "",
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
    onStateChange: ({ type }) => {
      // Handle creating new tag after state change
      if (
        type === useCombobox.stateChangeTypes.InputKeyDownEnter &&
        pendingNewTagRef.current
      ) {
        onChange([...values, pendingNewTagRef.current]);
        pendingNewTagRef.current = null;
        setInputValue("");
      }
    },
    stateReducer: (state, actionAndChanges) => {
      const { changes, type } = actionAndChanges;
      switch (type) {
        case useCombobox.stateChangeTypes.InputKeyDownEnter: {
          // Check if we should create a new tag
          const trimmedInput = state.inputValue?.trim();
          if (
            trimmedInput &&
            state.highlightedIndex < 0 && // No item is highlighted
            !filteredTags.find(
              (t) => t.name.toLowerCase() === trimmedInput.toLowerCase(),
            ) &&
            !values.includes(trimmedInput)
          ) {
            // Mark as pending new tag (will be handled in onStateChange)
            pendingNewTagRef.current = trimmedInput;
            return {
              ...changes,
              isOpen: true,
              highlightedIndex: -1,
              inputValue: "",
            };
          }
          // Selecting an existing tag
          return {
            ...changes,
            isOpen: true,
            highlightedIndex: state.highlightedIndex,
            inputValue: "",
          };
        }
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
            (filteredTags.length === 0 && inputValue ? (
              <li className="px-2 py-6 text-center text-sm">
                Press Enter to create "{inputValue}"
              </li>
            ) : (
              filteredTags.map((tag, index) => (
                <li
                  key={tag.id}
                  {...getItemProps({ item: tag, index })}
                  className={cn(
                    "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none",
                    highlightedIndex === index &&
                      "bg-accent text-accent-foreground",
                  )}
                >
                  <Check className="mr-2 size-4 opacity-0" />
                  {tag.name}
                </li>
              ))
            ))}
        </ul>
      </div>

      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedTags.map((item) => (
            <div
              className="flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-sm"
              key={item.id}
            >
              <span>{item.name}</span>
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
