/**
 * Strongly-typed translation shape.  Every locale file must satisfy
 * the `Messages` interface so a missing key becomes a build-time error
 * instead of a runtime "undefined" in the UI.
 *
 * When you add a new user-facing string:
 *   1. Add it here (with a good English default in `en.ts`).
 *   2. Add the Tamil translation in `ta.ts`.
 *   3. The TypeScript compiler will refuse to build until every locale
 *      is updated — that's on purpose.
 */

export type LocaleCode = 'en' | 'ta';

export interface Messages {
    app: {
        name: string;
        welcome: string;                    // "Welcome"
        hi: (firstName: string) => string;  // "Hi, {name}"
    };

    modeToggle: {
        findHelp: string;                   // "Find Help"
        findWork: string;                   // "Find Work"
    };

    home: {
        pickHelp: string;                   // "Pick what you need help with:"
        pickWork: string;                   // "Pick the kind of work you can do:"
        postNew: string;                    // "Post a new job"
        seeAll: string;                     // "See all jobs nearby"
        sos: string;                        // "Emergency (SOS)"
        sosSoon: string;                    // "SOS coming soon"
    };

    common: {
        back: string;
        profile: string;
        change: string;
        loading: string;
        cancel: string;
        ok: string;
        signIn: string;
        signOut: string;
        kmShort: (n: number) => string;     // "5 km"
        mShort: (n: number) => string;      // "800 m"
    };

    post: {
        title: string;                      // "Post a job"
        whatDoYouNeed: string;              // "What do you need?"
        category: string;                   // "Category"
        shortNote: string;                  // "Short note (optional)"
        notePlaceholder: string;
        looksLike: (label: string) => string;  // "Looks like: {label}"
        budget: string;                     // "Budget (₹)"
        decrease: string;                   // aria-label
        increase: string;                   // aria-label
        where: string;                      // "Where?"
        useMyLocation: string;
        pickCategoryFirst: string;
        allowLocation: string;
        posting: string;
        postJobNow: string;
        failedToPost: (msg: string) => string;
    };

    work: {
        title: string;                      // "Jobs near you"
        distance: string;                   // "Distance"
        withinKm: (n: number) => string;    // "Within {n} km"
        allCats: string;                    // "All"
        needLocation: string;
        shareLocation: string;
        noJobs: (radius: number) => string;
        sponsored: string;                  // "Sponsored"
        listView: string;                   // aria "List view"
        radarView: string;                  // aria "Radar view"
        radarHint: (n: number) => string;   // "{n} nearby · tap a dot to open"
        enableCompass: string;
        openInMaps: string;                 // aria
    };

    job: {
        title: string;                      // "Job"
        progress: string;
        acceptedByHelper: string;
        requesterMarkedDone: string;
        helperMarkedDone: string;
        requesterPaid: string;
        helperReceived: string;
        acceptThisJob: string;
        alreadyAccepted: string;
        markAsDone: string;                 // requester's button
        iFinished: string;                  // doer's button
        iPaidUpi: string;
        iReceivedPayment: string;
        payHint: string;
        howWasIt: string;
        thanksForRating: string;
        viewOnMap: string;
        directions: string;
    };

    me: {
        title: string;                      // "Me"
        notSignedIn: string;
        signInHint: string;
        phone: string;
        yourName: string;
        sendOtp: string;
        enterOtp: string;
        verifyAndSignIn: string;
        devOtpHint: (otp: string) => string;
        available: string;                  // "Available for work"
        visible: string;                    // "🟢 You are visible..."
        offline: string;                    // "⚪ Offline"
        skills: string;
        appearance: string;
        light: string;
        dark: string;
        system: string;
        language: string;
        completed: (n: number) => string;   // "{n} done"
    };

    tab: {
        home: string;
        work: string;
        post: string;
        me: string;
        more: string;
    };

    /**
     * Category labels are localised too — huge for non-English users.
     * Keyed by CategoryKey, so keep this map in sync with `data/categories.ts`.
     */
    category: {
        move: string;
        clean: string;
        plumb: string;
        electric: string;
        cab: string;
        auto: string;
        puncture: string;
        mechanic: string;
        cook: string;
        other: string;
    };
}
