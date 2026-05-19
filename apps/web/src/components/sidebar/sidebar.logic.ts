import { cn } from "@/lib/utils";

/** Row chrome aligned with t3code `resolveThreadRowClassName`. */
export function resolveSessionRowClassName(input: { isActive: boolean }): string {
  const baseClassName =
    "h-7 w-full translate-x-0 cursor-pointer justify-start px-2 text-left select-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring";

  if (input.isActive) {
    return cn(
      baseClassName,
      "bg-accent/85 font-medium text-foreground hover:bg-accent hover:text-foreground dark:bg-accent/55 dark:hover:bg-accent/70",
    );
  }

  return cn(baseClassName, "text-muted-foreground hover:bg-accent hover:text-foreground");
}
