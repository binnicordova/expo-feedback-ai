/**
 * feedb-ai backend — the four functions the board runs on, on Firebase.
 *
 * Shape of the thing: reads cost nothing and writes are rare. Devices never read
 * Firestore — they GET one public JSON file per app off Storage. They write only
 * when they have something to say: a batch of votes at most once an hour, a new
 * feedback on submit.
 *
 * The writes are plain `onRequest`, not `onCall`, so the payload on the wire is the
 * object itself rather than an `{ data }` envelope. That is what the expo-feedback-ai
 * client posts out of the box, so an app needs no transport code of its own.
 *
 * No validation here on purpose — the client owns the business rules. These four do
 * exactly one job each, and every write is an idempotent upsert on an id the client
 * minted, so a retry costs nothing and nothing here ever increments.
 */

const { setGlobalOptions } = require("firebase-functions/v2");
const { onRequest } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getStorage } = require("firebase-admin/storage");

initializeApp();

// A feedback board must never be able to outspend the app it lives in.
setGlobalOptions({ maxInstances: 10 });

const db = getFirestore();

const FEEDBACKS = "feedbacks";
const VOTES = "votes";
const APPS = "apps";

/**
 * Everything `/feedbacks` will write, and nothing else.
 *
 * A list rather than a `...req.body` spread, because `likes` is derived at build time
 * and must not be settable by posting one. Copied field by field, and only when the
 * field is actually present — which is the whole fix: the handler used to destructure
 * a fixed set and write it wholesale, so a partial update sent `undefined` for the
 * rest, and Firestore rejects that value outright. Every write the pipeline makes is
 * a partial update.
 *
 * `agentBuilding` and `agentReleased` are two independent booleans on purpose. Each is
 * set by the workflow that owns it, in one write, with no read first and no state
 * machine in between: `feedbai-autopilot.yml` sets `agentBuilding`, and
 * `feedbai-automerge.yml` sets `agentReleased`. Both are plain equality-indexed
 * fields, so `purge` can query one directly.
 */
const WRITABLE = [
	"deviceId",
	"title",
	"description",
	"createdAt",
	"agentBuilding",
	"agentReleased",
];

/**
 * Document ids are derived from the payload, never auto-generated, which is what
 * makes every write in this file an idempotent upsert: the client mints the `uid`
 * and the `deviceId`, so a retry after a dropped response overwrites the same row
 * instead of creating a second one. Nothing here ever increments.
 */
const rowId = (...parts) => parts.join("|");

/**
 * Marks an app as having changed, registering it on first sight.
 *
 * Nothing signs up: an app appears here the moment it writes, which is what lets the
 * module stay zero-configuration. The stamp is a watermark — `processFeedbacks` uses
 * it to rebuild only the feeds whose data actually moved, so an idle app costs one
 * document read per cycle rather than an aggregation query per idea.
 *
 * One extra write per request, amortised over a batch of up to 200 votes, against
 * skipping the entire aggregation pass for every app that has been quiet.
 */
const touchApp = (appId) =>
	db.collection(APPS).doc(appId).set({ lastWriteAt: Date.now() }, { merge: true });

/**
 * Anonymous devices post to these, so they are invocable by anyone — the normal
 * posture for an endpoint a mobile app talks to without a signed-in user. `cors` so a
 * web build can reach them from the browser too.
 *
 * `maxInstances` is the control that actually bounds a bill. These endpoints are the
 * open door: nothing identifies the caller, so nothing can stop someone hammering
 * them. What can be stopped is scale-out — past this many instances a flood turns
 * into 429s and queueing instead of unbounded spend. Real load never approaches it:
 * a device flushes at most once an hour, so three instances serve a very large number
 * of apps.
 */
const PUBLIC = { invoker: "public", cors: true, maxInstances: 3 };

/**
 * The cap that matters most in this file.
 *
 * `votes` writes one document per array entry, so without a bound a single request is
 * an arbitrarily large bill — 100k entries is 100k billed writes from one invocation.
 * A device queues one vote per idea it has seen, so a real batch is dozens; 200 is far
 * past anything the client can legitimately produce.
 */
const MAX_VOTES_PER_REQUEST = 200;

/* ------------------------------------------------------------------ *
 * 1. feedbacks — one row per submitted idea
 * ------------------------------------------------------------------ */

/**
 * `{ appId, uid, ...any of WRITABLE }` -> `feedbacks/{appId}|{uid}`, merged.
 *
 * One endpoint, two callers, one row:
 *
 *   a device        `{ appId, deviceId, uid, title, description, createdAt }`
 *   the autopilot   `{ appId, uid, agentBuilding: true }`
 *   the automerger  `{ appId, uid, agentReleased: true }`
 *
 * Merged, not replaced, and only over the fields the body actually carries — so a
 * flag write cannot wipe an idea's text and a client retry cannot wipe its flags.
 */
exports.feedbacks = onRequest(PUBLIC, async (req, res) => {
	const body = req.body ?? {};
	const { appId, uid } = body;

	// Rejected before touching Firestore: a malformed request should cost an
	// invocation and nothing else.
	if (!appId || !uid) {
		res.status(400).json({ error: "appId and uid are required" });
		return;
	}

	const row = { appId, uid };
	for (const key of WRITABLE) {
		if (body[key] !== undefined) row[key] = body[key];
	}

	await Promise.all([
		db.collection(FEEDBACKS).doc(rowId(appId, uid)).set(row, { merge: true }),
		touchApp(appId),
	]);

	res.json({ uid });
});

/* ------------------------------------------------------------------ *
 * 2. votes — one row per (appId, deviceId, uid)
 * ------------------------------------------------------------------ */

/**
 * `{ appId, deviceId, votes: [{ uid, liked, at }] }` -> one row each.
 *
 * A row, not a counter. Upserting `liked` per device means a batch that arrives
 * twice cannot inflate a total, and un-voting is just another upsert — the count is
 * derived at build time instead of being maintained here.
 *
 * `BulkWriter` rather than `batch()`: a batch caps at 500 writes and would reject a
 * larger backlog outright, which is the one failure a device cannot recover from.
 */
exports.votes = onRequest(PUBLIC, async (req, res) => {
	const { appId, deviceId, votes } = req.body ?? {};

	if (!appId || !deviceId || !Array.isArray(votes)) {
		res.status(400).json({ error: "appId, deviceId and votes[] are required" });
		return;
	}

	// 413 rather than a silent truncation: the client keeps what it could not send
	// and retries, so a batch is never half-applied and never quietly dropped.
	if (votes.length > MAX_VOTES_PER_REQUEST) {
		res.status(413).json({ error: `at most ${MAX_VOTES_PER_REQUEST} votes` });
		return;
	}

	const writer = db.bulkWriter();

	for (const { uid, liked, at } of votes) {
		writer.set(
			db.collection(VOTES).doc(rowId(appId, deviceId, uid)),
			{ appId, deviceId, uid, liked, at },
			{ merge: true },
		);
	}

	await Promise.all([writer.close(), touchApp(appId)]);
	res.json({ written: votes.length });
});

/* ------------------------------------------------------------------ *
 * 3. processFeedbacks — cron, every 6h: publish one JSON feed per app
 * ------------------------------------------------------------------ */

/** Firestore caps `count()` fan-out well before this; it just keeps latency sane. */
const AGGREGATE_CONCURRENCY = 50;

const chunk = (items, size) => {
	const out = [];
	for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
	return out;
};

/**
 * Likes for one idea, as an aggregation rather than a scan.
 *
 * This is the whole cost story of the cron. Reading every vote row to tally them
 * would cost one document read per vote — the collection grows with DAU × ideas.
 * `count()` is billed at one read per 1000 index entries it matches, so the run
 * costs on the order of one read per *idea* instead, and stops scaling with traffic.
 */
const countLikes = async (appId, uid) => {
	const snapshot = await db
		.collection(VOTES)
		.where("appId", "==", appId)
		.where("uid", "==", uid)
		.where("liked", "==", true)
		.count()
		.get();

	return snapshot.data().count;
};

/**
 * The feed exactly as the client's `FeedbackFeed` type declares it.
 *
 * `generatedAt` is a single top-level scalar — it is what tells a device that a feed
 * already accounts for a vote it is still holding locally, and it belongs to the file,
 * not to every row in it.
 *
 * Optional fields are omitted rather than sent as null: they are optional on the
 * client, and dropping them keeps the file honest about what the backend actually
 * knows. `JSON.stringify` skips an `undefined` value.
 */
const buildFeed = (items, generatedAt) => ({
	generatedAt,
	items: items.map((item) => ({
		uid: item.uid,
		title: item.title ?? "",
		description: item.description ?? "",
		likes: item.likes,
		author: item.author || undefined,
		comments: item.comments || undefined,
		agentBuilding: item.agentBuilding === true ? true : undefined,
		createdAt: item.createdAt ?? undefined,
	})),
});

/**
 * Every 6 hours: tally the votes, and publish one public JSON file per app at
 * `feedbacks/<appId>.json`.
 *
 * One file per app is what keeps the read path free — a device GETs a static object
 * off the CDN and no function runs at all.
 *
 * Driven off the `apps` collection rather than a scan of every feedback in the system,
 * and it rebuilds only the apps whose data moved since their last build. On a free
 * tier most apps are idle on any given cycle, so this is the difference between a run
 * that costs one read per app and one that costs an aggregation query per idea across
 * every app that ever existed.
 */
exports.processFeedbacks = onSchedule(
	{ schedule: "0 */6 * * *", timeoutSeconds: 540, memory: "512MiB" },
	async () => {
		const generatedAt = Date.now();
		const bucket = getStorage().bucket();
		const apps = await db.collection(APPS).get();

		let built = 0;
		let skipped = 0;
		let failed = 0;

		for (const app of apps.docs) {
			const appId = app.id;
			const { lastWriteAt = 0, lastBuiltAt = 0 } = app.data();

			// Nothing has been written since the feed that is already published. The
			// first cycle for an app always builds, because lastBuiltAt is still 0.
			if (lastBuiltAt > 0 && lastWriteAt <= lastBuiltAt) {
				skipped++;
				continue;
			}

			// One app must not be able to take the run down with it. Without this, a
			// single failure — a bucket that refuses `makePublic`, an aggregation that
			// times out — aborts the loop, so every app after it in iteration order
			// gets no feed at all, and none of them is stamped, so the next cycle
			// walks into the same wall. The autopilot reads a published file; a run
			// that dies early is a board that silently stops moving.
			try {
				const snapshot = await db
					.collection(FEEDBACKS)
					.where("appId", "==", appId)
					.get();

				// Released ideas have shipped and should leave the board now, rather
				// than lingering until `purge` next runs — which is up to three days
				// later. Filtered here rather than in the query: most rows have no such
				// field at all, and a Firestore `!=` would drop every one of them.
				const items = snapshot.docs
					.map((doc) => doc.data())
					.filter((item) => item.agentReleased !== true);

				for (const group of chunk(items, AGGREGATE_CONCURRENCY)) {
					await Promise.all(
						group.map(async (item) => {
							item.likes = await countLikes(appId, item.uid);
						}),
					);
				}

				const file = bucket.file(`${FEEDBACKS}/${appId}.json`);

				await file.save(JSON.stringify(buildFeed(items, generatedAt)), {
					contentType: "application/json",
					metadata: {
						// The file only changes every 6h, so revalidating every 5 minutes
						// was paying for origin reads on a byte-identical object. An hour
						// of staleness against a six-hour cadence is invisible — and it
						// is why the autopilot treats this file as a UI signal rather
						// than as the authority on what it has already built.
						cacheControl: "public, max-age=3600",
					},
				});
				await file.makePublic();

				// Stamped with the watermark that was *read*, not with "now": a write
				// that landed while this app was being built has a later `lastWriteAt`
				// and so still triggers a rebuild on the next cycle instead of being
				// swallowed. An app with no writes yet (seeded data) is stamped with
				// the build time so it does not rebuild forever.
				await app.ref.set(
					{ lastBuiltAt: lastWriteAt || generatedAt },
					{ merge: true },
				);

				built++;
				console.log(`published ${appId}: ${items.length} ideas`);
			} catch (error) {
				// Not stamped, so the next cycle retries it.
				failed++;
				console.error(`failed ${appId}:`, error);
			}
		}

		console.log(
			`processFeedbacks: ${built} built, ${skipped} unchanged, ${failed} failed, at ${generatedAt}`,
		);
	},
);

/* ------------------------------------------------------------------ *
 * 4. purge — cron, every 3 days: drop what has already shipped
 * ------------------------------------------------------------------ */

/** One page per round trip; Firestore's own write batches sit well under this. */
const PURGE_PAGE = 500;

/** Deletes everything a query matches, a page at a time. Returns how many went. */
const deleteAll = async (query) => {
	let deleted = 0;

	for (;;) {
		const snapshot = await query.limit(PURGE_PAGE).get();
		if (snapshot.empty) return deleted;

		const writer = db.bulkWriter();
		for (const doc of snapshot.docs) writer.delete(doc.ref);
		await writer.close();

		deleted += snapshot.size;
		if (snapshot.size < PURGE_PAGE) return deleted;
	}
};

/**
 * Every 72 hours, delete the feedbacks an agent has already released — and the votes
 * cast on them.
 *
 * Reached only because `feedbai-automerge.yml` can set `agentReleased`. While that
 * write was being rejected, this query matched nothing on every run: released ideas
 * stayed on the board and `votes` — the collection that grows with DAU × ideas, and
 * the one every `count()` above scans — was never collected at all.
 *
 * The votes are the point. They are the collection that grows without bound: one row
 * per device per idea, kept forever, inflating both storage and the index that every
 * `count()` in `processFeedbacks` scans. Deleting the idea and leaving its votes makes
 * the system slower and more expensive the longer it succeeds.
 *
 * Votes go first. If this dies half way, the feedback still carries `agentReleased`
 * and gets retried on the next run; deleting the feedback first would strand its votes
 * with nothing left pointing at them.
 *
 * Expressed in hours rather than as a day-of-month step, which is not actually every
 * three days: stepping restarts at the 1st of each month, so it fires twice in 24
 * hours at the end of every 31-day month.
 */
exports.purge = onSchedule(
	{ schedule: "every 72 hours", timeoutSeconds: 540 },
	async () => {
		let purged = 0;
		let votesPurged = 0;

		for (;;) {
			const snapshot = await db
				.collection(FEEDBACKS)
				.where("agentReleased", "==", true)
				.limit(PURGE_PAGE)
				.get();

			if (snapshot.empty) break;

			for (const doc of snapshot.docs) {
				const { appId, uid } = doc.data();
				votesPurged += await deleteAll(
					db
						.collection(VOTES)
						.where("appId", "==", appId)
						.where("uid", "==", uid),
				);
			}

			const writer = db.bulkWriter();
			for (const doc of snapshot.docs) writer.delete(doc.ref);
			await writer.close();

			purged += snapshot.size;
			if (snapshot.size < PURGE_PAGE) break;
		}

		console.log(
			`purge: ${purged} released feedbacks, ${votesPurged} votes with them`,
		);
	},
);
