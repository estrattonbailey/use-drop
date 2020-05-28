import * as React from "react";

import {
  ItemConfig,
  Item,
  OnSelect,
  Noop,
  UseDrop,
} from "./types";

let instance = 10; // start at a

export function useDrop({
  items,
  onSelect,
  onOpen,
  onDismiss,
}: {
  items: ItemConfig[];
  onSelect?: OnSelect;
  onOpen?: Noop;
  onDismiss?: Noop;
}): UseDrop {
  const id = React.useMemo(() => (instance++).toString(36), []);

  // refs
  const controlRef = React.useRef<HTMLElement>(null);
  const dropdownRef = React.useRef<HTMLElement>(null);

  // state
  const isMouseDown = React.useRef(false); // avoid re-render
  const [isOpen, isOpenSet] = React.useState(false);
  const [highlightedIndex, highlightedIndexSet] = React.useState(0);
  const safeHighlightedIndex = Math.min(highlightedIndex, items.length - 1);
  const _isOpenSet = React.useCallback(
    (open: boolean) => {
      isOpenSet(open);
      if (open && onOpen) onOpen();
      if (!open && onDismiss) onDismiss();
    },
    [isOpenSet]
  );
  const _highlightedIndexSet = React.useCallback(
    (index: number) => {
      highlightedIndexSet(Math.min(index, safeHighlightedIndex));
    },
    [safeHighlightedIndex]
  );
  // merge internal state/methods with items array
  const _items = React.useMemo<Item[]>(
    () =>
      items.map((item, o) => {
        return {
          ...item,
          selected: false,
          highlighted: safeHighlightedIndex === o,
          getItemProps(props = {}) {
            return {
              ...props,
              onClick(e) {
                if (item.disabled) return;

                if (onSelect) onSelect(item);
                if (props.onClick) props.onClick(e);

                highlightedIndexSet(o < items.length ? o : 0);
              },
            };
          },
        };
      }),
    [items, onSelect, safeHighlightedIndex, highlightedIndexSet]
  );

  // all key events
  React.useEffect(() => {
    function keydown(e: KeyboardEvent) {
      const { keyCode } = e;
      const control = controlRef.current;

      if (!control) return;

      const up = keyCode === 38;
      const down = keyCode === 40;
      const enter = keyCode === 13;
      const space = keyCode === 32;
      const esc = keyCode === 27;

      if (document.activeElement === control) {
        if (!isOpen && (up || down)) _isOpenSet(true);
        if (space) _isOpenSet(!isOpen);
      }

      if (up || down) {
        e.preventDefault();
      }

      if (isOpen) {
        const lastIndex = items.length - 1;
        const nextIndex = up ? highlightedIndex - 1 : highlightedIndex + 1;

        if (up || down) {
          highlightedIndexSet(
            nextIndex > lastIndex ? 0 : nextIndex < 0 ? lastIndex : nextIndex
          );
        } else if (enter && isOpen) {
          if (onSelect) onSelect(items[safeHighlightedIndex]);
        } else if (esc) {
          _isOpenSet(false);
        }
      }
    }

    document.addEventListener("keydown", keydown);

    return () => {
      document.removeEventListener("keydown", keydown);
    };
  }, [highlightedIndex, items, isOpen, controlRef, onSelect]);

  // outside click
  React.useEffect(() => {
    function click(e: MouseEvent) {
      const dropdown = dropdownRef.current;
      const control = controlRef.current;

      if (
        !dropdown ||
        !control ||
        e.target === dropdown ||
        e.target === control ||
        dropdown.contains(e.target as Node) ||
        control.contains(e.target as Node)
      )
        return;

      _isOpenSet(false);
    }

    if (isOpen) {
      document.addEventListener("click", click);
    }

    return () => {
      document.removeEventListener("click", click);
    };
  }, [isOpen, dropdownRef]);

  // used to determine if drop should close on blur
  React.useEffect(() => {
    function mousedown() {
      isMouseDown.current = true;
    }
    function mouseup() {
      isMouseDown.current = false;
    }

    document.addEventListener("mousedown", mousedown);
    document.addEventListener("mouseup", mouseup);

    return () => {
      document.removeEventListener("mousedown", mousedown);
      document.removeEventListener("mouseup", mouseup);
    };
  }, []);

  return {
    id,
    isOpen,
    isOpenSet: _isOpenSet,
    items: _items,
    highlightedIndexSet: _highlightedIndexSet,
    getControlProps(props = {}) {
      return {
        ...props,
        ref: controlRef,
        id,
        role: "listbox",
        "aria-controls": `drop-${id}`,
        "aria-haspopup": "listbox",
        "aria-expanded": isOpen,
        onBlur() {
          if (isMouseDown.current) return;
          _isOpenSet(false);
        },
        onClick(e: React.MouseEvent<HTMLElement>) {
          // avoid triggering by Enter
          if (e.clientX + e.clientY > 0) {
            _isOpenSet(!isOpen);
          }
        },
      };
    },
    getDropProps(props = {}) {
      return {
        ...props,
        ref: dropdownRef,
        id: `drop-${id}`,
        role: "listbox",
      };
    },
  };
}
