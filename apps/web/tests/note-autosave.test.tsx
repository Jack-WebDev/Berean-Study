import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/functions/notes", () => ({ saveNote: vi.fn() }));

import {
	type NoteFormValues,
	NoteSaveStatus,
	type NoteStatus,
	useNoteAutosave,
} from "../src/components/notes/note-save-lifecycle";

const emptyValues: NoteFormValues = {
	content: { content: [{ type: "paragraph" }], type: "doc" },
	passageIds: [],
	purpose: null,
	tags: [],
	title: "",
};

function withText(text: string, title = ""): NoteFormValues {
	return {
		...emptyValues,
		content: {
			content: [{ content: [{ text, type: "text" }], type: "paragraph" }],
			type: "doc",
		},
		title,
	};
}

function Harness({
	noteStatus = null,
	onSave,
	values,
}: {
	noteStatus?: NoteStatus | null;
	onSave: (values: NoteFormValues) => Promise<unknown>;
	values: NoteFormValues;
}) {
	const autosave = useNoteAutosave({
		initialValues: emptyValues,
		isManualSaveInProgress: false,
		noteStatus,
		onSave,
		values,
	});
	return (
		<NoteSaveStatus
			canAutosave={autosave.canAutosave}
			lastSavedAt={autosave.lastSavedAt}
			noteStatus={noteStatus}
			onRetry={autosave.retry}
			state={autosave.state}
		/>
	);
}

beforeEach(() => {
	vi.useFakeTimers();
});

afterEach(() => {
	cleanup();
	vi.useRealTimers();
});

describe("note autosave", () => {
	it("starts as an untouched draft", () => {
		render(<Harness onSave={vi.fn()} values={emptyValues} />);
		expect(screen.getByRole("status").textContent).toBe(
			"Draft · autosaves as you write",
		);
	});

	it("saves an untitled draft about a second after typing stops", async () => {
		const onSave = vi.fn().mockResolvedValue(undefined);
		const { rerender } = render(
			<Harness onSave={onSave} values={emptyValues} />,
		);

		rerender(<Harness onSave={onSave} values={withText("They searched")} />);
		expect(screen.getByRole("status").textContent).toBe("Saving…");
		await act(async () => vi.advanceTimersByTime(900));
		expect(onSave).not.toHaveBeenCalled();

		await act(async () => vi.advanceTimersByTime(200));
		expect(onSave).toHaveBeenCalledWith(withText("They searched"));
		expect(screen.getByRole("status").textContent).toBe(
			"Draft saved · just now",
		);
	});

	it("does not autosave a saved note whose title was cleared", async () => {
		const onSave = vi.fn().mockResolvedValue(undefined);
		render(
			<Harness noteStatus="saved" onSave={onSave} values={withText("Body")} />,
		);

		await act(async () => vi.advanceTimersByTime(2000));
		expect(onSave).not.toHaveBeenCalled();
		expect(screen.getByRole("status").textContent).toBe(
			"Add a title to save changes",
		);
	});

	it("offers a retry when saving fails", async () => {
		const onSave = vi
			.fn()
			.mockRejectedValueOnce(new Error("offline"))
			.mockResolvedValue(undefined);
		const { rerender } = render(
			<Harness onSave={onSave} values={emptyValues} />,
		);
		rerender(<Harness onSave={onSave} values={withText("Body")} />);

		await act(async () => vi.advanceTimersByTime(1000));
		const retry = screen.getByRole("button", { name: "Couldn’t save — retry" });

		await act(async () => fireEvent.click(retry));
		expect(onSave).toHaveBeenCalledTimes(2);
		expect(screen.getByRole("status").textContent).toBe(
			"Draft saved · just now",
		);
	});
});
