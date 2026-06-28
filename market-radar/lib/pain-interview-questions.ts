export const PAIN_INTERVIEW_QUESTIONS = [
  {
    id: "too_late",
    prompt: "What do you usually find out too late?",
    hint: "Competitor moves, RFP windows, pricing shifts, regulations...",
    defaultPainIds: ["found_out_too_late", "competitor_move_missed"] as const,
  },
  {
    id: "worth_interrupting",
    prompt: "What would make this worth interrupting you?",
    hint: "What severity or type of signal deserves an escalation?",
    defaultPainIds: ["noise_without_signal", "cant_translate_to_action"] as const,
  },
  {
    id: "manual_checks",
    prompt: "What do you currently check manually?",
    hint: "Sites, feeds, newsletters, competitor pages...",
    defaultPainIds: ["nobodys_job", "found_out_too_late"] as const,
  },
  {
    id: "watch_targets",
    prompt: "What sources or competitors should Bestie watch?",
    hint: "Names, URLs, or source types if you know them.",
    defaultPainIds: ["competitor_move_missed", "found_out_too_late"] as const,
  },
  {
    id: "digest_destination",
    prompt: "Where should the digest land?",
    hint: "Email address for now; other channels available in managed Bestie.",
    defaultPainIds: ["nobodys_job"] as const,
  },
  {
    id: "recommended_action",
    prompt: "What should Bestie recommend when something matters?",
    hint: "Call a customer, adjust pricing, respond to RFP, brief sales...",
    defaultPainIds: ["cant_translate_to_action", "saw_but_froze"] as const,
  },
] as const;
