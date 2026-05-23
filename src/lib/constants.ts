export const SYMPTOMS: { id: string; label: string; group: string }[] = [
  // Pain
  { id: "cramps", label: "Cramps", group: "Pain" },
  { id: "headache", label: "Headache", group: "Pain" },
  { id: "migraine", label: "Migraine", group: "Pain" },
  { id: "backache", label: "Backache", group: "Pain" },
  { id: "breast-tender", label: "Breast tenderness", group: "Pain" },
  { id: "bloating", label: "Bloating", group: "Pain" },
  { id: "body-aches", label: "Body aches", group: "Pain" },
  { id: "joint-pain", label: "Joint pain", group: "Pain" },
  { id: "ovulation-pain", label: "Ovulation pain", group: "Pain" },
  // Digestive
  { id: "nausea", label: "Nausea", group: "Digestive" },
  { id: "constipation", label: "Constipation", group: "Digestive" },
  { id: "diarrhea", label: "Diarrhea", group: "Digestive" },
  { id: "gas", label: "Gas", group: "Digestive" },
  { id: "appetite-up", label: "Increased appetite", group: "Digestive" },
  { id: "appetite-down", label: "Decreased appetite", group: "Digestive" },
  { id: "cravings-sweet", label: "Sweet cravings", group: "Digestive" },
  { id: "cravings-salty", label: "Salty cravings", group: "Digestive" },
  // Skin & hair
  { id: "acne", label: "Acne", group: "Skin & Hair" },
  { id: "oily-skin", label: "Oily skin", group: "Skin & Hair" },
  { id: "dry-skin", label: "Dry skin", group: "Skin & Hair" },
  { id: "glow", label: "Glowing skin", group: "Skin & Hair" },
  { id: "greasy-hair", label: "Greasy hair", group: "Skin & Hair" },
  // Energy & cognition
  { id: "high-energy", label: "High energy", group: "Energy" },
  { id: "low-energy", label: "Low energy", group: "Energy" },
  { id: "exhausted", label: "Exhausted", group: "Energy" },
  { id: "focused", label: "Focused", group: "Energy" },
  { id: "brain-fog", label: "Brain fog", group: "Energy" },
  // Sleep
  { id: "insomnia", label: "Insomnia", group: "Sleep" },
  { id: "vivid-dreams", label: "Vivid dreams", group: "Sleep" },
  { id: "night-sweats", label: "Night sweats", group: "Sleep" },
  // Other
  { id: "hot-flash", label: "Hot flash", group: "Other" },
  { id: "chills", label: "Chills", group: "Other" },
  { id: "dizziness", label: "Dizziness", group: "Other" },
];

export const MOODS: { id: string; label: string; emoji?: string }[] = [
  { id: "happy", label: "Happy" },
  { id: "calm", label: "Calm" },
  { id: "energetic", label: "Energetic" },
  { id: "confident", label: "Confident" },
  { id: "sensitive", label: "Sensitive" },
  { id: "anxious", label: "Anxious" },
  { id: "sad", label: "Sad" },
  { id: "irritable", label: "Irritable" },
  { id: "angry", label: "Angry" },
  { id: "mood-swings", label: "Mood swings" },
  { id: "depressed", label: "Low" },
  { id: "withdrawn", label: "Withdrawn" },
];

export const FLOW_OPTIONS = [
  { id: "spotting", label: "Spotting" },
  { id: "light", label: "Light" },
  { id: "medium", label: "Medium" },
  { id: "heavy", label: "Heavy" },
] as const;

export const SEX_OPTIONS = [
  { id: "protected", label: "Protected" },
  { id: "unprotected", label: "Unprotected" },
  { id: "withdrawal", label: "Withdrawal" },
  { id: "solo", label: "Solo" },
] as const;

export const CM_OPTIONS = [
  { id: "dry", label: "Dry" },
  { id: "sticky", label: "Sticky" },
  { id: "creamy", label: "Creamy" },
  { id: "watery", label: "Watery" },
  { id: "egg-white", label: "Egg white" },
] as const;

export const GOAL_MODES = [
  { id: "track", label: "Just track" },
  { id: "ttc", label: "Trying to conceive" },
  { id: "avoid", label: "Avoid pregnancy" },
  { id: "pregnancy", label: "Pregnant" },
  { id: "perimenopause", label: "Perimenopause" },
] as const;
