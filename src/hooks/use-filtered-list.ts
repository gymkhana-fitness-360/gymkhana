import { useMemo, useState } from "react";

type FilterFn<T> = (item: T) => boolean;

type UseFilteredListOptions<T> = {
  search?: string;
  searchKeys?: Array<(item: T) => string | null | undefined>;
  filter?: FilterFn<T>;
};

/** Client-side search + filter for list panels (finances, bills, etc.). */
export function useFilteredList<T>(
  items: T[] | undefined,
  options?: UseFilteredListOptions<T>,
) {
  const [search, setSearch] = useState(options?.search ?? "");
  const filterFn = options?.filter;
  const searchKeys = options?.searchKeys;

  const filtered = useMemo(() => {
    const list = items ?? [];
    const term = search.trim().toLowerCase();
    return list.filter((item) => {
      if (filterFn && !filterFn(item)) return false;
      if (!term) return true;
      if (!searchKeys || searchKeys.length === 0) return true;
      return searchKeys.some((key) => (key(item) ?? "").toLowerCase().includes(term));
    });
  }, [items, filterFn, searchKeys, search]);

  return { search, setSearch, filtered, total: items?.length ?? 0 };
}
