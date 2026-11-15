import { httpRouter } from 'convex/server';
import * as keiki from './keiki';

const http = httpRouter();

// Keiki routes: keep independent of Vishnu's /whop/webhook route.
http.route({ path: '/keiki/gig', method: 'POST', handler: keiki.createGig });
http.route({ path: '/keiki/results', method: 'GET', handler: keiki.results });
http.route({ path: '/keiki/status', method: 'GET', handler: keiki.status });

export default http;
