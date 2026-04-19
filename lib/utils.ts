import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Helper to safely get a name from a list of objects with id and name/type fields.
 */
export function getName<T extends { id: string; name?: string; type?: string }>(
  list: T[],
  id: string
): string {
  const item = list.find((i) => i.id === id);
  return item?.name ?? item?.type ?? "—";
}