export interface StoryChapter {
  round: number;
  operation: string;
  title: string;
  dateTime: string;
  lines: string[];
}

export const storyChapters: Record<number, StoryChapter> = {
  1: {
    round: 1,
    operation: "OPERATION BLACKOUT",
    title: "The Point of Entry",
    dateTime: "January 14 \u00b7 02:17 AM",
    lines: [
      "A silent logon. Correct username. Correct password. Correct subnet.",
      "The account belonged to a backup service that had been decommissioned months earlier.",
      "Between authentication and authorization, the attacker stepped through the door nobody remembers closing.",
      "Within ninety seconds, the authentication logs were gone. Others followed.",
      "But they were in a hurry. One fragment survived in a temporary backup directory.",
      "A session ID. A username. A path misspelled with deliberate precision.",
      "They knew this machine. They were not guessing.",
      "This was someone who had walked these halls before.",
    ],
  },
  2: {
    round: 2,
    operation: "OPERATION BLACKOUT",
    title: "What They Tried to Hide",
    dateTime: "January 14 \u00b7 02:18 AM",
    lines: [
      "The trail grew cold on purpose.",
      "Permissions chmodded to zero. Histories left half-written. Flags folded into environment files.",
      "A service account — svc-unknown — created once, used once, scrubbed after.",
      "Persistence buried in a cron job that pointed at a script that pointed at a lie.",
      "Archives staged like crates on a loading dock, waiting to be shipped out of the building.",
      "This was not vandalism. It was inventory.",
      "Someone was counting what this server held — and deciding what they meant to take.",
      "The cover-up was the confession. Every denial told us exactly where to look.",
    ],
  },
  3: {
    round: 3,
    operation: "OPERATION BLACKOUT",
    title: "The Last Trace",
    dateTime: "January 14 \u00b7 04:30 AM",
    lines: [
      "The second system looked clean. Too clean.",
      "An invoice that was not an invoice. A binary that whispered paths in its strings.",
      "Two doors, identical, side by side — one false, one true. They wanted you to choose wrong.",
      "Timestamps aligned like teeth in a zipper. Every move from 02:17 to 04:00, mapped end to end.",
      "And in the deepest stash, the signature they could not scrub.",
      "Former systems administrator. Let go in December. Keys revoked on paper — never on instinct.",
      "In the weeks before their exit, they had buried the accounts and the fallbacks needed to get back in.",
      "The 02:17 intrusion was not a raid. It was a return to rooms already claimed.",
      "They were after the financial records and the encryption keys — a double extortion staged for the worst possible morning.",
      "You followed every trace they tried to erase. You close the file.",
      "Case 02:17 — closed.",
    ],
  },
};