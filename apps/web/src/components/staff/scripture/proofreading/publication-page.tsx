import type { PermissionKey } from "@berean-study/db/access-catalogue";

import { ContentPublicationLists } from "../../content/content-publication-lists";
import { StaffPage } from "../../staff-page";
import { ReadyToPublishList } from "./ready-to-publish-list";

export function PublicationPage({
	permissionKeys,
}: {
	permissionKeys: readonly PermissionKey[];
}) {
	return (
		<StaffPage
			description="Work that has been checked by someone else and is waiting to go live. Publishing is recorded under your name."
			section="Administration"
			title="Publication"
		>
			<div className="space-y-6">
				<ContentPublicationLists permissionKeys={permissionKeys} />
				<ReadyToPublishList
					canPublish={permissionKeys.includes("publication.publish")}
				/>
			</div>
		</StaffPage>
	);
}
