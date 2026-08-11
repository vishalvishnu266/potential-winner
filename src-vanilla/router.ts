/** Shared router singleton. Import this everywhere for navigation. */
import { Router } from './framework';
export const router = new Router().setFallback('/');
