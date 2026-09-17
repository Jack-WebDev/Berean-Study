const allowedTags = new Set([
	"a",
	"blockquote",
	"br",
	"del",
	"em",
	"h1",
	"h2",
	"h3",
	"i",
	"li",
	"ol",
	"p",
	"s",
	"strong",
	"strike",
	"table",
	"tbody",
	"td",
	"th",
	"thead",
	"tr",
	"u",
	"ul",
]);
const dangerousTags = new Set(["iframe", "object", "script", "style", "svg"]);
const allowedProtocols = new Set(["http:", "https:", "mailto:"]);

function safeHref(value: string) {
	try {
		return allowedProtocols.has(new URL(value, "https://berean.study").protocol)
			? value
			: null;
	} catch {
		return null;
	}
}

/**
 * Removes presentational and executable paste data while retaining the small
 * semantic HTML subset represented by the editor schema. H1 becomes H2,
 * because resources own their page title.
 */
export function sanitizePastedHtml(html: string) {
	if (typeof DOMParser === "undefined") return html;
	const document = new DOMParser().parseFromString(html, "text/html");
	for (const element of [...document.body.querySelectorAll("*")].reverse()) {
		const tag = element.tagName.toLowerCase();
		if (dangerousTags.has(tag)) {
			element.remove();
			continue;
		}
		if (!allowedTags.has(tag)) {
			element.replaceWith(...element.childNodes);
			continue;
		}
		if (tag === "h1") {
			const heading = document.createElement("h2");
			heading.replaceChildren(...element.childNodes);
			element.replaceWith(heading);
			continue;
		}
		const href =
			tag === "a" ? safeHref(element.getAttribute("href") ?? "") : null;
		for (const attribute of [...element.attributes])
			element.removeAttribute(attribute.name);
		if (href) element.setAttribute("href", href);
	}
	return document.body.innerHTML;
}
