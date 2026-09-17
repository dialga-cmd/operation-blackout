export interface EventDetail {
  label: string;
  value: string;
}

export interface EventRule {
  title: string;
  description: string;
}

export const EVENT_INFO = {
  title: "OPERATION BLACKOUT",
  subtitle: "LINUX BASED ONLINE CTF",
  intro:
    "A three-day Linux capture-the-flag operation. Each day presents a new compromised system — investigate the trail, recover each flag, and be the first to close the case.",
  details: [
    { label: "ORGANIZER", value: "Jarvis Society" },
    { label: "DATES", value: "19th - 21st September" },
    { label: "EVENT TYPE", value: "Linux Based Online CTF (Capture The Flag)" },
    { label: "ELIGIBILITY", value: "Students of IITMBS" },
    { label: "REGISTRATION", value: "Join the Jarvis Society" },
    { label: "CONTACT", value: "+91 7717722747" },
  ],
  rules: [
    {
      title: "SOLO EVENT",
      description:
        "Participants must compete individually. Team participation is not allowed.",
    },
    {
      title: "NUMBER OF ROUNDS",
      description:
        "3 rounds will be held — one each day on the 19th, 20th, and 21st of September.",
    },
    {
      title: "JUDGING CRITERIA",
      description:
        "Fastest Finger First logic. Participants are ranked based on the speed of solving challenges. The first person to correctly submit the flag wins that round.",
    },
    {
      title: "FLAG SHARING PROHIBITION",
      description:
        "Sharing flags with any other participant or receiving flags from others is strictly prohibited. Any participant found sharing or receiving flags will be disqualified immediately.",
    },
  ],
} as const;