/**
 * A rule refused the request, such as approving your own change. The message is
 * written for the person who tried, so it is safe to show them as it is.
 */
export class GovernanceError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "GovernanceError";
	}
}
