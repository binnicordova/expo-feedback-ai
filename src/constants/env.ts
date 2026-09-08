/** Namespace for every AsyncStorage key this module owns. */
export const STORAGE_PREFIX = "feedbai/";

/**
 * The hosted backend, fixed at build time.
 *
 * Not configurable, deliberately. An app that can point the board somewhere else is
 * an app that can point it at nothing — a typo'd URL is a board that silently stays
 * empty, and that failure lands on the module rather than on whoever typed it. The
 * feed file is named after the app's own bundle id, so two apps cannot collide and
 * neither has to be told what it is called.
 */
export const FEED_ORIGIN =
	"https://storage.googleapis.com/feedbai.firebasestorage.app/feedbacks";
export const API_ORIGIN = "https://us-central1-feedbai.cloudfunctions.net";

/**
 * How often the local queue (votes + new feedbacks) is pushed.
 *
 * A minute in development so an integrator sees their first idea reach the board
 * while they are still looking at it; an hour in production, where a feedback board
 * has no business waking the radio more often than that.
 */
export const FLUSH_INTERVAL_MS = __DEV__ ? 60 * 1000 : 60 * 60 * 1000;

/** How long the cached feed stays fresh before we download it again. */
export const FEED_TTL_MS = __DEV__ ? 30 * 1000 : 60 * 60 * 1000;

/**
 * How often the backend publishes: the top-voted ideas are built and leave the feed,
 * and what is left is re-ranked. A newcomer's head start halves over this span, so it
 * gets one full cycle of exposure before it has to stand on its own votes.
 *
 * This one does not shorten in development: it is the cadence the board *promises*
 * in its subtitle, and a promise that reads differently in dev than in production is
 * worse than no promise.
 */
export const RANK_CYCLE_MS = 3 * 24 * 60 * 60 * 1000;

/** How long an unpublished local draft is shown before moderation is assumed to have dropped it. */
export const DRAFT_TTL_MS = 30 * 24 * 60 * 60 * 1000;
