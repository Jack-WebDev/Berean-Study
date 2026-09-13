import { Button } from "@berean-study/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@berean-study/ui/components/dropdown-menu";
import { EllipsisIcon } from "lucide-react";
import { toast } from "sonner";

export function NotificationOptions({
	compact = false,
}: {
	compact?: boolean;
}) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button
						aria-label="Notification options"
						className={compact ? "size-8" : "size-[38px] rounded-[9px]"}
						size={compact ? "icon-sm" : "icon"}
						type="button"
						variant="outline"
					/>
				}
			>
				<EllipsisIcon aria-hidden="true" />
			</DropdownMenuTrigger>
			<DropdownMenuContent
				align="end"
				className="w-44 rounded-lg p-1"
				sideOffset={6}
			>
				<DropdownMenuGroup>
					<DropdownMenuItem
						onClick={() =>
							toast.info("Notification preferences are coming soon.")
						}
					>
						Notification preferences
					</DropdownMenuItem>
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
