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
}
