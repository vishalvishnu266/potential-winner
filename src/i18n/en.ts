import type { Messages } from './types';

/**
 * English — the source language.  Every other locale must translate
 * every key here.
 */
const en: Messages = {
    app: {
        name: 'DailyGig',
        welcome: 'Welcome 👋',
        hi: (firstName) => `Hi, ${firstName} 👋`,
    },

    modeToggle: {
        findHelp: 'Find Help',
        findWork: 'Find Work',
    },

    home: {
        pickHelp: 'Pick what you need help with:',
        pickWork: 'Pick the kind of work you can do:',
        postNew:  'Post a new job',
        seeAll:   'See all jobs nearby',
        sos:      'Emergency (SOS)',
        sosSoon:  'SOS coming soon',
    },

    common: {
        back: 'Back',
        profile: 'Profile',
        change: 'Change',
        loading: 'Loading…',
        cancel: 'Cancel',
        ok: 'OK',
        signIn: 'Sign in',
        signOut: 'Sign out',
        kmShort: (n) => `${n} km`,
        mShort:  (n) => `${n} m`,
    },

    post: {
        title: 'Post a job',
        whatDoYouNeed: 'What do you need?',
        category: 'Category',
        shortNote: 'Short note (optional)',
        notePlaceholder: 'e.g. Shift 1 sofa from 2nd floor to auto',
        looksLike: (label) => `Looks like: ${label}`,
        budget: 'Budget (₹)',
        decrease: 'Decrease',
        increase: 'Increase',
        where: 'Where?',
        useMyLocation: 'Use my location',
        pickCategoryFirst: 'Pick a category first',
        allowLocation: 'Please allow location access',
        posting: 'Posting…',
        postJobNow: 'Post job now',
        failedToPost: (msg) => `Failed to post: ${msg}`,
    },

    work: {
        title: 'Jobs near you',
        distance: 'Distance',
        withinKm: (n) => `Within ${n} km`,
        allCats: 'All',
        needLocation: 'We need your location to find nearby jobs.',
        shareLocation: 'Share location',
        noJobs: (radius) =>
            `No jobs within ${radius} km right now.\nTry a bigger radius, or check again soon.`,
        sponsored: 'Sponsored',
        listView: 'List view',
        radarView: 'Radar view',
        radarHint: (n) => `${n} nearby · tap a dot to open`,
        enableCompass: '🧭 Enable compass',
        openInMaps: 'Open in maps',
    },

    job: {
        title: 'Job',
        progress: 'Progress',
        acceptedByHelper: 'Accepted by a helper',
        requesterMarkedDone: 'Requester marked done',
        helperMarkedDone: 'Helper marked done',
        requesterPaid: 'Requester paid',
        helperReceived: 'Helper received payment',
        acceptThisJob: 'Accept this job',
        alreadyAccepted: 'Already accepted by another helper.',
        markAsDone: 'Mark as done',
        iFinished: 'I finished the work',
        iPaidUpi: 'I paid (via UPI)',
        iReceivedPayment: 'I received payment',
        payHint: 'Pay/receive money in your own UPI app, then confirm here.',
        howWasIt: 'How was it?',
        thanksForRating: 'Thanks for rating!',
        viewOnMap: 'View on map',
        directions: 'Directions',
    },

    me: {
        title: 'Me',
        notSignedIn: 'Not signed in',
        signInHint: 'Sign in to post & accept jobs',
        phone: 'Phone number',
        yourName: 'Your name (optional)',
        sendOtp: 'Send OTP',
        enterOtp: 'Enter OTP',
        verifyAndSignIn: 'Verify & sign in',
        devOtpHint: (otp) => `Dev OTP is ${otp}`,
        available: 'Available for work',
        visible: '🟢 You are visible to nearby users',
        offline:  '⚪ Offline',
        skills: 'Skills',
        appearance: 'Appearance',
        light:  '☀️ Light',
        dark:   '🌙 Dark',
        system: '📱 System',
        language: 'Language',
        completed: (n) => `${n} done`,
    },

    tab: {
        home: 'Home',
        work: 'Work',
        post: 'Post',
        me:   'Me',
        more: 'More',
    },

    category: {
        move:     'Move / Shift',
        clean:    'Cleaning',
        plumb:    'Plumber',
        electric: 'Electrician',
        cab:      'Cab',
        auto:     'Auto',
        puncture: 'Puncture',
        mechanic: 'Mechanic',
        cook:     'Cook',
        other:    'Other',
    },
};

export default en;
