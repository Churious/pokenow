/**
 * Translation contract. Every locale file must satisfy `Messages`, so a
 * missing key is a type error. Interpolated strings are functions, which keeps
 * word order free for each language.
 *
 * Rich text: `{golden}` / `{peak}` markers inside `how.p2` are replaced by
 * coloured spans at render time (see `rich()` in ./index.tsx).
 */
export interface Messages {
  /** Native language name shown in the picker. */
  languageName: string;

  units: {
    /** Compact duration: days, hours, minutes, seconds. */
    d: string;
    h: string;
    m: string;
    s: string;
    /** Put a space between number and unit ("3 h" vs "3h"). */
    spaced: boolean;
    /** Separator between parts ("3h 07m" vs "3時間07分"). */
    sep: string;
    km: string;
    min: string;
  };

  nav: {
    home: string;
    language: string;
    utc: string;
  };

  status: {
    goldenHour: string;
    raidHour: string;
    spotlightHour: string;
    peak: string;
    quiet: string;
  };

  best: {
    now: string;
    from: (origin: string) => string;
    kmAway: (km: string) => string;
    readyGolden: (wait: string, event: string) => string;
    readyPeak: (wait: string) => string;
    readyUpcoming: (wait: string, opens: string) => string;
    endsIn: (event: string, d: string) => string;
    peakThenGolden: (d: string) => string;
    peakEndsIn: (d: string) => string;
    allQuiet: (d: string) => string;
    dialLabel: string;
  };

  list: {
    title: string;
    all: string;
    regions: { 'Asia-Pacific': string; 'Europe & Middle East': string; Americas: string };
    regionFilter: string;
    wait: (d: string) => string;
    endsIn: (d: string) => string;
    goldenIn: (d: string) => string;
    opensIn: (d: string) => string;
    details: (city: string) => string;
    /** Link to the GitHub issue form for suggesting a hotspot. */
    suggest: string;
  };

  route: {
    title: string;
    intro: string;
    empty: string;
    arrive: (time: string) => string;
    /** "From Busan → 325 km, wait 1h 04m" */
    leg: (from: string, distance: string, wait: string) => string;
    noWait: string;
    summary: (stops: number, total: string, distance: string) => string;
    note: (dwell: string) => string;
  };

  travel: {
    title: string;
    intro: string;
    statusLabel: string;
    ready: string;
    cooldown: string;
    softban: string;
    lastActionAt: string;
    otherPlace: string;
    howLongAgo: string;
    justNow: string;
    minutes: (n: number) => string;
    coordsLabel: string;
    set: string;
    coordsError: string;
    yourLastSpot: string;
    summary: (ago: string, place: string, freeIn: string) => string;
    minAgo: (n: number) => string;
    allReady: string;
    softbanTitle: string;
    softban1: string;
    softban2: string;
    softban3: string;
  };

  copy: {
    button: string;
    copied: string;
    toast: (city: string, coords: string) => string;
    failed: string;
    aria: (place: string, coords: string) => string;
  };

  favorites: {
    /** Action label / aria-label when the spot is not pinned. */
    pin: string;
    unpin: string;
    /** Button label when the spot is already pinned. */
    pinned: string;
    hint: string;
  };

  share: {
    button: string;
    copied: string;
    failed: string;
    /** Plain-text payload: place, coordinates, current local time and URL. */
    text: (place: string, coords: string, localTime: string, url: string) => string;
  };

  how: {
    title: string;
    p1: string;
    /** Contains {golden} and {peak} markers. */
    p2: string;
    p3: string;
  };

  cooldown: {
    title: string;
    intro: string;
    distance: string;
    wait: string;
    upTo: (km: string) => string;
    range: (a: string, b: string) => string;
    over: (km: string) => string;
  };

  footer: {
    disclaimer: string;
    extra: string;
    source: string;
    privacy: string;
    sponsor: string;
    translation: string;
  };

  ads: {
    label: string;
    short: string;
    close: string;
  };

  city: {
    back: string;
    localTime: string;
    nextGolden: string;
    nextRaidHour: string;
    nextSpotlight: string;
    liveNow: string;
    inDuration: (d: string) => string;
    openGoogle: string;
    openOsm: string;
    /** Link to the official Campfire app (raids & gyms map). */
    openCampfire: string;
    mapTitle: string;
    mapNote: string;
    otherSpots: string;
    seoIntro: (city: string, spot: string) => string;
  };

  community: {
    title: string;
    intro: string;
    empty: string;
    add: string;
    rules: string;
    join: string;
    global: string;
    other: string;
    kakao: string;
  };

  map: {
    title: string;
    intro: string;
    loading: string;
    viewSpot: string;
  };

  schedule: {
    title: string;
    intro: string;
    bossesTitle: string;
    /** "until Dec 1" */
    bossesUntil: (date: string) => string;
    kinds: { communityDay: string; raidDay: string; event: string };
    /** "14:00–17:00 local time" */
    localTime: (range: string) => string;
    /** Global events: "21:00–23:00 your time" */
    yourTime: (range: string) => string;
    today: string;
    inDays: (n: number) => string;
    startsIn: (d: string) => string;
    liveHere: (d: string) => string;
    elsewhere: string;
    details: string;
    sourceNote: string;
    officialNews: string;
    weekly: string;
    loading: string;
    error: string;
    empty: string;
  };

  tabs: {
    label: string;
    spots: string;
    route: string;
    events: string;
    map: string;
    guide: string;
  };

  report: {
    translationTitle: string;
    hotspotTitle: string;
    /** Public-issue and privacy notice shown next to the send button. */
    publicNote: string;
    language: string;
    current: string;
    suggestion: string;
    notes: string;
    city: string;
    spot: string;
    coords: string;
    source: string;
    sourceHint: string;
    note: string;
    /** Reveals the optional note field. */
    addNote: string;
    communityTitle: string;
    communityName: string;
    platform: string;
    inviteUrl: string;
    inviteHint: string;
    communityHotspots: string;
    communityHotspotsHint: string;
    languages: string;
    languagesHint: string;
    description: string;
    ruleNoCheat: string;
    ruleAdmin: string;
    send: string;
    sending: string;
    sentTitle: string;
    sentBody: string;
    close: string;
    githubAlt: string;
    errors: { captcha: string; missing: string; coords: string; tooLong: string; network: string; generic: string; url: string };
  };
  /** Polite request shown to visitors with an ad blocker (components/SupportNote.tsx). */
  support: {
    title: string;
    /** Shown once on the first visit without a blocker after one was seen. */
    thanksTitle: string;
    thanksBody: string;
    close: string;
    body: string;
    how: string;
    later: string;
    steps: { ublock: string; adguard: string; other: string };
  };
}
