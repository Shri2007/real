import { httpRouter } from 'convex/server';
import * as keiki from './keiki';
import { webhook as whopWebhook } from './payments';

const http = httpRouter();

// Keiki routes: keep independent of Vishnu's /whop/webhook route.
http.route({ path: '/keiki/gig', method: 'POST', handler: keiki.createGig });
http.route({ path: '/keiki/results', method: 'GET', handler: keiki.results });
http.route({ path: '/keiki/status', method: 'GET', handler: keiki.status });

http.route({ path: '/whop/webhook', method: 'POST', handler: whopWebhook });

export default http;
