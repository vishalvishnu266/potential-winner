/**
 * Tiny i18n — bundle-of-strings, framework-agnostic.
 *
 *   const t = i18n.t;
 *   t.home.pickHelp   // → 'Pick what you need help with:'
 *   t.common.kmShort(3)  // → '3 km'
 *
 * `i18n.setLocale('ta')` swaps the active bundle and notifies subscribers.
 */

export type Locale = 'en' | 'ta';

export interface Messages {
  app: {
    name: string;
    welcome: string;
    hi: (firstName: string) => string;
  };
  modeToggle: { findHelp: string; findWork: string };
  home: {
    pickHelp: string; pickWork: string;
    postNew: string; seeAll: string; sos: string; sosSoon: string;
    localBusinesses: string;
  };
  common: {
    back: string; profile: string; change: string; loading: string;
    cancel: string; ok: string; signIn: string; signOut: string;
    kmShort: (n: number | string) => string;
    mShort:  (n: number | string) => string;
  };
  post: {
    title: string; whatDoYouNeed: string; category: string;
    shortNote: string; notePlaceholder: string;
    looksLike: (label: string) => string;
    budget: string; decrease: string; increase: string; where: string;
    useMyLocation: string; pickCategoryFirst: string; allowLocation: string;
    posting: string; postJobNow: string;
    failedToPost: (msg: string) => string;
  };
  work: {
    title: string; distance: string;
    withinKm: (n: number) => string;
    allCats: string; needLocation: string; shareLocation: string;
    noJobs: (radius: number) => string;
    sponsored: string; listView: string; radarView: string;
    radarHint: (n: number) => string;
    enableCompass: string; openInMaps: string;
  };
  job: {
    title: string; progress: string;
    acceptedByHelper: string; requesterMarkedDone: string; helperMarkedDone: string;
    requesterPaid: string; helperReceived: string;
    acceptThisJob: string; alreadyAccepted: string; markAsDone: string;
    iFinished: string; iPaidUpi: string; iReceivedPayment: string;
    payHint: string; howWasIt: string; thanksForRating: string;
    viewOnMap: string; directions: string;
  };
  me: {
    title: string; settings: string; notSignedIn: string; signInHint: string;
    phone: string; yourName: string; sendOtp: string; enterOtp: string;
    verifyAndSignIn: string;
    devOtpHint: (otp: string) => string;
    available: string; visible: string; offline: string;
    skills: string; appearance: string;
    light: string; dark: string; system: string;
    language: string;
    completed: (n: number) => string;
  };
  tab: { home: string; work: string; post: string; me: string; more: string; local: string };
  local: {
    title: string; subtitle: string; empty: string;
    wantToList: string; contactUs: string; seeAllLocal: string; offer: string;
  };
  category: {
    move: string; clean: string; plumb: string; electric: string;
    cab: string; auto: string; puncture: string; mechanic: string;
    cook: string; other: string;
  };
}

const en: Messages = {
  app: { name: 'DailyGig', welcome: 'Welcome 👋', hi: (n) => `Hi, ${n} 👋` },
  modeToggle: { findHelp: 'Find Help', findWork: 'Find Work' },
  home: {
    pickHelp: 'Pick what you need help with:',
    pickWork: 'Pick the kind of work you can do:',
    postNew: 'Post a new job', seeAll: 'See all jobs nearby',
    sos: 'Emergency (SOS)', sosSoon: 'SOS coming soon',
    localBusinesses: 'Local businesses',
  },
  common: {
    back: 'Back', profile: 'Profile', change: 'Change', loading: 'Loading…',
    cancel: 'Cancel', ok: 'OK', signIn: 'Sign in', signOut: 'Sign out',
    kmShort: (n) => `${n} km`, mShort: (n) => `${n} m`,
  },
  post: {
    title: 'Post a job', whatDoYouNeed: 'What do you need?',
    category: 'Category', shortNote: 'Short note (optional)',
    notePlaceholder: 'e.g. Shift 1 sofa from 2nd floor to auto',
    looksLike: (l) => `Looks like: ${l}`,
    budget: 'Budget (₹)', decrease: 'Decrease', increase: 'Increase',
    where: 'Where?', useMyLocation: 'Use my location',
    pickCategoryFirst: 'Pick a category first',
    allowLocation: 'Please allow location access',
    posting: 'Posting…', postJobNow: 'Post job now',
    failedToPost: (m) => `Failed to post: ${m}`,
  },
  work: {
    title: 'Jobs near you', distance: 'Distance',
    withinKm: (n) => `Within ${n} km`, allCats: 'All',
    needLocation: 'We need your location to find nearby jobs.',
    shareLocation: 'Share location',
    noJobs: (r) => `No jobs within ${r} km right now.\nTry a bigger radius, or check again soon.`,
    sponsored: 'Sponsored', listView: 'List view', radarView: 'Radar view',
    radarHint: (n) => `${n} nearby · tap a dot to open`,
    enableCompass: '🧭 Enable compass', openInMaps: 'Open in maps',
  },
  job: {
    title: 'Job', progress: 'Progress',
    acceptedByHelper: 'Accepted by a helper',
    requesterMarkedDone: 'Requester marked done',
    helperMarkedDone: 'Helper marked done',
    requesterPaid: 'Requester paid', helperReceived: 'Helper received payment',
    acceptThisJob: 'Accept this job',
    alreadyAccepted: 'Already accepted by another helper.',
    markAsDone: 'Mark as done', iFinished: 'I finished the work',
    iPaidUpi: 'I paid (via UPI)', iReceivedPayment: 'I received payment',
    payHint: 'Pay/receive money in your own UPI app, then confirm here.',
    howWasIt: 'How was it?', thanksForRating: 'Thanks for rating!',
    viewOnMap: 'View on map', directions: 'Directions',
  },
  me: {
    title: 'Me', settings: 'Settings', notSignedIn: 'Not signed in',
    signInHint: 'Sign in to post & accept jobs',
    phone: 'Phone number', yourName: 'Your name (optional)',
    sendOtp: 'Send OTP', enterOtp: 'Enter OTP', verifyAndSignIn: 'Verify & sign in',
    devOtpHint: (o) => `Dev OTP is ${o}`,
    available: 'Available for work',
    visible: '🟢 You are visible to nearby users', offline: '⚪ Offline',
    skills: 'Skills', appearance: 'Appearance',
    light: '☀️ Light', dark: '🌙 Dark', system: '📱 System',
    language: 'Language', completed: (n) => `${n} done`,
  },
  tab: { home: 'Home', work: 'Work', post: 'Post', me: 'Me', more: 'More', local: 'Local' },
  local: {
    title: 'Local Businesses', subtitle: 'Nearby shops, services & offers',
    empty: 'No nearby offers right now.',
    wantToList: 'Want your shop listed here?', contactUs: 'Contact us',
    seeAllLocal: 'See all local offers', offer: 'Offer',
  },
  category: {
    move: 'Move / Shift', clean: 'Cleaning', plumb: 'Plumber', electric: 'Electrician',
    cab: 'Cab', auto: 'Auto', puncture: 'Puncture', mechanic: 'Mechanic',
    cook: 'Cook', other: 'Other',
  },
};

const ta: Messages = {
  ...en,
  app:        { ...en.app,        welcome: 'வணக்கம் 👋', hi: (n) => `வணக்கம், ${n} 👋` },
  modeToggle: { findHelp: 'உதவி தேடு', findWork: 'வேலை தேடு' },
  home:       { ...en.home,
    pickHelp: 'என்ன உதவி தேவை என்பதைத் தேர்ந்தெடு:',
    pickWork: 'எந்த வேலை செய்ய முடியும் என்பதைத் தேர்ந்தெடு:',
    postNew: 'புதிய வேலை போடு', seeAll: 'பக்கத்தில் உள்ள எல்லா வேலைகளும்',
    sos: 'அவசர உதவி (SOS)', sosSoon: 'விரைவில் வரும்',
    localBusinesses: 'உள்ளூர் கடைகள்',
  },
  tab: { home: 'முகப்பு', work: 'வேலை', post: 'போடு', me: 'நான்', more: 'மேலும்', local: 'உள்ளூர்' },
};

const bundles: Record<Locale, Messages> = { en, ta };

class I18n {
  private locale: Locale = 'en';
  private listeners = new Set<() => void>();
  get t(): Messages { return bundles[this.locale]; }
  getLocale(): Locale { return this.locale; }
  setLocale(l: Locale): void {
    if (l === this.locale) return;
    this.locale = l;
    this.listeners.forEach((f) => f());
  }
  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
}

export const i18n = new I18n();
