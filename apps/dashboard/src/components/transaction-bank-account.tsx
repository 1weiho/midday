import { cn } from "@midday/ui/utils";
import Image from "next/image";

export function TransactionBankAccount({
  logoUrl,
  name,
  size = 20,
  className,
}) {
  return (
    <div className="flex space-x-2 mt-1 items-center">
      {logoUrl && (
        <div className="rounded-full overflow-hidden border border-1">
          <Image
            src={logoUrl}
            alt={name}
            width={size}
            height={size}
            className="aspect-square"
          />
        </div>
      )}
      <span className={cn("text-sm", className)}>{name}</span>
    </div>
  );
}
