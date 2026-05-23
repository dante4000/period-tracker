/**
 * Vault identity helpers.
 *
 * The user's identity is a passphrase. We derive a stable vaultId via SHA-256
 * so the same passphrase always points to the same blob path - works across
 * any device that knows the phrase. We also derive a canary so we can verify
 * future writes are using the same passphrase (defense against typos).
 */

const enc = new TextEncoder();

async function sha256Hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", enc.encode(s));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function deriveVaultId(passphrase: string): Promise<string> {
  const normalized = passphrase.trim().toLowerCase().replace(/\s+/g, " ");
  const h = await sha256Hex("vault-v1:" + normalized);
  return h.slice(0, 40);
}

export async function deriveVaultCanary(passphrase: string): Promise<string> {
  const normalized = passphrase.trim().toLowerCase().replace(/\s+/g, " ");
  const h = await sha256Hex("canary-v1:" + normalized);
  return h.slice(0, 16);
}

const WORDS = [
  "amber","aurora","basil","blossom","breeze","clover","copper","cosmos",
  "crimson","crystal","daisy","dawn","drift","echo","ember","fern",
  "forest","garnet","ginger","harvest","heather","ivy","jade","juniper",
  "lake","lily","linden","lotus","lumen","luna","maple","meadow",
  "mint","misty","moss","ocean","onyx","opal","orchid","peach",
  "pearl","pebble","petal","poppy","quartz","raven","ribbon","river",
  "rose","ruby","sage","sapphire","scarlet","silver","sky","sorrel",
  "spruce","star","stone","summer","sunlit","thistle","topaz","violet",
  "willow","winter","wren","yarrow","zephyr","autumn","brook","cedar",
  "cinder","cocoa","dewy","dusk","feather","fiona","glow","haven",
  "hazel","honey","indigo","ivory","jasper","kestrel","laurel","lyric",
  "marble","nectar","north","plum","prairie","quill","robin","saffron",
  "tide","tulip","vale","velvet","wisp","zenith","glade","melody",
];

export function generatePassphrase(): string {
  const arr = new Uint32Array(4);
  crypto.getRandomValues(arr);
  return Array.from(arr)
    .map((n) => WORDS[n % WORDS.length])
    .join("-");
}

const DEVICE_ID_KEY = "pt:deviceId";

export function getDeviceId(): string {
  if (typeof window === "undefined") return "server";
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    const arr = new Uint8Array(8);
    crypto.getRandomValues(arr);
    id = Array.from(arr)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}
