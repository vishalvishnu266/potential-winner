import type { Messages } from './types';

/**
 * Tamil (தமிழ்).  Translations reviewed for clarity and short length —
 * mobile tiles have limited horizontal space, so we prefer common
 * everyday words over overly formal literary Tamil.
 *
 * Money units use "₹" (universally understood) rather than "ரூ" so
 * layouts stay consistent across locales.
 */
const ta: Messages = {
    app: {
        name: 'DailyGig',
        welcome: 'வணக்கம் 👋',
        hi: (firstName) => `வணக்கம், ${firstName} 👋`,
    },

    modeToggle: {
        findHelp: 'உதவி தேடு',
        findWork: 'வேலை தேடு',
    },

    home: {
        pickHelp: 'என்ன உதவி வேண்டும் என்பதைத் தேர்வு செய்யவும்:',
        pickWork: 'நீங்கள் செய்யக்கூடிய வேலையைத் தேர்வு செய்யவும்:',
        postNew:  'புதிய வேலை பதிவு செய்',
        seeAll:   'அருகிலுள்ள அனைத்து வேலைகள்',
        sos:      'அவசர உதவி (SOS)',
        sosSoon:  'SOS விரைவில் வரும்',
    },

    common: {
        back: 'திரும்பு',
        profile: 'சுயவிவரம்',
        change: 'மாற்று',
        loading: 'ஏற்றுகிறது…',
        cancel: 'ரத்து',
        ok: 'சரி',
        signIn: 'உள்நுழை',
        signOut: 'வெளியேறு',
        kmShort: (n) => `${n} கி.மீ`,
        mShort:  (n) => `${n} மீ`,
    },

    post: {
        title: 'வேலை பதிவு செய்',
        whatDoYouNeed: 'என்ன வேண்டும்?',
        category: 'வகை',
        shortNote: 'குறிப்பு (விருப்பம்)',
        notePlaceholder: 'உ.தா. 2ம் மாடியிலிருந்து ஆட்டோவுக்கு சோஃபா எடுக்க வேண்டும்',
        looksLike: (label) => `இது போல் தெரிகிறது: ${label}`,
        budget: 'தொகை (₹)',
        decrease: 'குறை',
        increase: 'கூட்டு',
        where: 'எங்கே?',
        useMyLocation: 'என் இடத்தைப் பயன்படுத்து',
        pickCategoryFirst: 'முதலில் வகையைத் தேர்வு செய்யவும்',
        allowLocation: 'இடம் அணுகலை அனுமதிக்கவும்',
        posting: 'பதிவு செய்கிறது…',
        postJobNow: 'இப்போது பதிவு செய்',
        failedToPost: (msg) => `பதிவு தோல்வி: ${msg}`,
    },

    work: {
        title: 'அருகிலுள்ள வேலைகள்',
        distance: 'தூரம்',
        withinKm: (n) => `${n} கி.மீ க்குள்`,
        allCats: 'அனைத்தும்',
        needLocation: 'அருகிலுள்ள வேலைகளைக் கண்டறிய உங்கள் இடம் தேவை.',
        shareLocation: 'இடத்தைப் பகிர்',
        noJobs: (radius) =>
            `${radius} கி.மீ க்குள் இப்போது வேலைகள் இல்லை.\nதூரத்தை அதிகரிக்கவும் அல்லது சிறிது நேரத்தில் மீண்டும் பாருங்கள்.`,
        sponsored: 'விளம்பரம்',
        listView: 'பட்டியல் காட்சி',
        radarView: 'ரேடார் காட்சி',
        radarHint: (n) => `${n} அருகில் · திறக்க புள்ளியைத் தொடவும்`,
        enableCompass: '🧭 திசைகாட்டியை இயக்கு',
        openInMaps: 'வரைபடத்தில் திற',
    },

    job: {
        title: 'வேலை',
        progress: 'நிலை',
        acceptedByHelper: 'உதவியாளர் ஏற்றுக்கொண்டார்',
        requesterMarkedDone: 'கோரிக்கையாளர் முடிந்ததாக குறித்தார்',
        helperMarkedDone: 'உதவியாளர் முடிந்ததாக குறித்தார்',
        requesterPaid: 'கோரிக்கையாளர் பணம் கொடுத்தார்',
        helperReceived: 'உதவியாளர் பணம் பெற்றார்',
        acceptThisJob: 'இந்த வேலையை ஏற்று',
        alreadyAccepted: 'மற்றொரு உதவியாளர் ஏற்றுக்கொண்டார்.',
        markAsDone: 'முடிந்ததாக குறி',
        iFinished: 'வேலையை முடித்தேன்',
        iPaidUpi: 'நான் பணம் கொடுத்தேன் (UPI)',
        iReceivedPayment: 'நான் பணம் பெற்றேன்',
        payHint: 'உங்கள் UPI செயலியில் பணம் கொடுத்து/பெற்று, பின்னர் இங்கு உறுதிசெய்யவும்.',
        howWasIt: 'எப்படி இருந்தது?',
        thanksForRating: 'மதிப்பிட்டதற்கு நன்றி!',
        viewOnMap: 'வரைபடத்தில் காண்',
        directions: 'திசைகள்',
    },

    me: {
        title: 'நான்',
        notSignedIn: 'உள்நுழையவில்லை',
        signInHint: 'வேலை பதிவு செய்ய / ஏற்க உள்நுழையவும்',
        phone: 'தொலைபேசி எண்',
        yourName: 'உங்கள் பெயர் (விருப்பம்)',
        sendOtp: 'OTP அனுப்பு',
        enterOtp: 'OTP உள்ளிடவும்',
        verifyAndSignIn: 'சரிபார்த்து உள்நுழை',
        devOtpHint: (otp) => `Dev OTP: ${otp}`,
        available: 'வேலைக்கு தயார்',
        visible: '🟢 அருகிலுள்ள பயனர்களுக்கு நீங்கள் தெரிகிறீர்கள்',
        offline:  '⚪ ஆஃப்லைன்',
        skills: 'திறமைகள்',
        appearance: 'தோற்றம்',
        light:  '☀️ வெளிச்சம்',
        dark:   '🌙 இருள்',
        system: '📱 சாதனம்',
        language: 'மொழி',
        completed: (n) => `${n} முடிந்தது`,
    },

    tab: {
        home: 'முகப்பு',
        work: 'வேலை',
        post: 'பதிவு',
        me:   'நான்',
        more: 'மேலும்',
    },

    category: {
        move:     'மாற்றம் / இடமாற்றம்',
        clean:    'சுத்தம்',
        plumb:    'குழாய் பணி',
        electric: 'மின்சாரம்',
        cab:      'கார்',
        auto:     'ஆட்டோ',
        puncture: 'பஞ்சர்',
        mechanic: 'மெக்கானிக்',
        cook:     'சமையல்',
        other:    'மற்றவை',
    },
};

export default ta;
