/**
 * Plain-language explanation of the ranking, shown near the bottom of the page.
 * Keeps the page useful on its own (and gives readers a reason to trust the pick).
 */
export function HowItWorks() {
  return (
    <section aria-labelledby="how-title" className="border-b border-rule py-6">
      <h2 id="how-title" className="semi-condensed text-lg font-bold text-ink">
        How PokeSpot picks a spot
      </h2>
      <div className="mt-3 max-w-prose space-y-3 text-sm leading-relaxed text-dim">
        <p>
          Raids are busiest when local players are free. PokeSpot reads the local time of every hotspot from your
          browser’s built-in time zone data, so daylight saving changes are handled automatically.
        </p>
        <p>
          Spots between <span className="text-gold">18:00 and 19:00</span> local time come first. That hour hosts the
          weekly Raid Hour on Wednesdays and Spotlight Hour on Tuesdays. Next come spots in the{' '}
          <span className="text-peak">11:00 to 20:00</span> window, when most players raid. If every spot is quiet,
          the one that opens soonest wins. Ties go to the busier city.
        </p>
        <p>
          If you set your cooldown, each spot also shows its distance from your last action and how long you still need
          to wait there. Spots are then judged by the window they will be in when your wait is over, so you don’t
          arrive just as a lobby empties out.
        </p>
      </div>
    </section>
  );
}
