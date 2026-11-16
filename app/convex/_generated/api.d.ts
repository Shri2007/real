/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as catalog from "../catalog.js";
import type * as creator from "../creator.js";
import type * as email from "../email.js";
import type * as gigs from "../gigs.js";
import type * as http from "../http.js";
import type * as insights from "../insights.js";
import type * as keiki from "../keiki.js";
import type * as notify from "../notify.js";
import type * as payments from "../payments.js";
import type * as prefs from "../prefs.js";
import type * as ranking from "../ranking.js";
import type * as reactions from "../reactions.js";
import type * as report from "../report.js";
import type * as seed from "../seed.js";
import type * as ugc from "../ugc.js";
import type * as users from "../users.js";
import type * as verify from "../verify.js";
import type * as voice from "../voice.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  catalog: typeof catalog;
  creator: typeof creator;
  email: typeof email;
  gigs: typeof gigs;
  http: typeof http;
  insights: typeof insights;
  keiki: typeof keiki;
  notify: typeof notify;
  payments: typeof payments;
  prefs: typeof prefs;
  ranking: typeof ranking;
  reactions: typeof reactions;
  report: typeof report;
  seed: typeof seed;
  ugc: typeof ugc;
  users: typeof users;
  verify: typeof verify;
  voice: typeof voice;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
