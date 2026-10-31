"use client";

import React, { useState, useRef, useEffect, type KeyboardEvent } from "react";
import { X } from "lucide-react";

export interface Option {
  id: string;
  label: string;
}

interface MultiSelectInputProps {
  options: Option[]; // all available options
  selectedIds: string[]; // ids of selected items
  onChange: (selectedIds: string[]) => void;
  placeholder?: string;
  className?: string;
}

export function MultiSelectInput({
  options,
  selectedIds,
  onChange,
  placeholder = "Search...",
  className = "",
}: MultiSelectInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredOptions = options.filter(
    (opt) =>
      opt.label.toLowerCase().includes(inputValue.toLowerCase()) &&
      !selectedIds.includes(opt.id)
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (id: string) => {
    onChange([...selectedIds, id]);
    setInputValue("");
    setIsOpen(false);
  };

  const handleRemove = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    onChange(selectedIds.filter((selId) => selId !== id));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && inputValue === "" && selectedIds.length > 0) {
      handleRemove(selectedIds[selectedIds.length - 1]!);
    } else if (e.key === "Enter" && isOpen && filteredOptions.length > 0) {
      e.preventDefault();
      handleSelect(filteredOptions[highlightedIndex]?.id as string);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        Math.min(prev + 1, filteredOptions.length - 1)
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.max(prev - 1, 0));
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative flex min-h-[24px] flex-wrap items-center gap-1 border border-gray-400 bg-white px-1 py-0.5 text-xs ${className}`}
      onClick={() => setIsOpen(true)}
    >
      {selectedIds.map((id) => {
        const option = options.find((o) => o.id === id);
        return (
          <span
            key={id}
            className="flex items-center gap-1 rounded bg-slate-200 px-1 py-0.5 text-slate-800"
          >
            {option?.label || id}
            <button
              type="button"
              onClick={(e) => handleRemove(id, e)}
              className="text-slate-500 hover:text-red-500"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        );
      })}
      <input
        type="text"
        value={inputValue}
        onChange={(e) => {
          setInputValue(e.target.value);
          setIsOpen(true);
          setHighlightedIndex(0);
        }}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsOpen(true)}
        placeholder={selectedIds.length === 0 ? placeholder : ""}
        className="flex-1 min-w-[60px] border-none bg-transparent outline-none p-0 focus:ring-0 text-xs"
      />
      
      {isOpen && filteredOptions.length > 0 && (
        <ul className="absolute left-0 top-full z-50 mt-1 max-h-40 w-full overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg">
          {filteredOptions.map((opt, index) => (
            <li
              key={opt.id}
              className={`cursor-pointer px-2 py-1 text-xs ${
                index === highlightedIndex
                  ? "bg-blue-100 text-blue-900"
                  : "hover:bg-slate-100"
              }`}
              onMouseDown={(e) => {
                e.preventDefault(); // prevents input blur
                handleSelect(opt.id);
              }}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              {opt.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
