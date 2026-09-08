const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

const plural = (value: number, unit: string) =>
	`${value} ${unit}${value === 1 ? "" : "s"} ago`;

/** "2 days ago", "last week", "6 days ago" — the phrasing a feedback board uses. */
export const timeAgo = (at: number | undefined, now = Date.now()) => {
	if (!at) return "";
	const elapsed = Math.max(0, now - at);

	if (elapsed < MINUTE) return "just now";
	if (elapsed < HOUR) return plural(Math.floor(elapsed / MINUTE), "minute");
	if (elapsed < DAY) return plural(Math.floor(elapsed / HOUR), "hour");
	if (elapsed < 2 * DAY) return "yesterday";
	if (elapsed < WEEK) return plural(Math.floor(elapsed / DAY), "day");
	if (elapsed < 2 * WEEK) return "last week";
	if (elapsed < MONTH) return plural(Math.floor(elapsed / WEEK), "week");
	if (elapsed < YEAR) return plural(Math.floor(elapsed / MONTH), "month");
	return plural(Math.floor(elapsed / YEAR), "year");
};

/** "akiff premjee" -> "AP", "matthewcellison" -> "MA". */
export const initialsOf = (name: string | undefined) => {
	const words = (name ?? "").trim().split(/\s+/).filter(Boolean);
	if (words.length === 0) return "??";
	const letters =
		words.length > 1
			? `${words[0][0]}${words[1][0]}`
			: (words[0] ?? "").slice(0, 2);
	return letters.toUpperCase();
};

/**
 * RFC-4122 v4 shape from Math.random. Deliberately not a CSPRNG: this only
 * labels an anonymous install so the backend can dedupe votes, and a client-held
 * id is spoofable regardless — not worth a native crypto dependency.
 */
export const uuid = () =>
	"xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
		const random = (Math.random() * 16) | 0;
		return (char === "x" ? random : (random & 0x3) | 0x8).toString(16);
	});

/**
 * "every 3 days" — how often you build the winners, said the way a person would.
 * The board prints this so its promise stays tied to `rankCycleMs` instead of a
 * number someone typed into copy once and forgot.
 */
export const cadenceLabel = (ms: number) => {
	const hours = Math.round(ms / HOUR);
	if (hours < 2) return "continuously";
	if (hours < 24) return `every ${hours} hours`;

	const days = Math.round(hours / 24);
	if (days === 1) return "every day";
	if (days === 7) return "every week";
	if (days % 7 === 0) return `every ${days / 7} weeks`;
	return `every ${days} days`;
};
