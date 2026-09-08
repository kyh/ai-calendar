import { cn } from "cn";
import { Loader2Icon } from "lucide-react";

const Spinner = ({ className, ...props }: React.ComponentProps<"svg">) => (
  <Loader2Icon
    data-slot="spinner"
    // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- the spinner is an svg; <output> cannot replace it
    role="status"
    aria-label="Loading"
    className={cn("size-4 animate-spin", className)}
    {...props}
  />
);

export { Spinner };
