import { storeContract } from "@caffeine/core/testing";
import { LocalStorageStore, STORAGE_KEY } from "./local-storage-store";

/** A minimal Storage so the tests don't depend on the test runner's localStorage. */
function fakeStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (k) => map.get(k) ?? null,
    key: (i) => [...map.keys()][i] ?? null,
    removeItem: (k) => void map.delete(k),
    setItem: (k, v) => void map.set(k, String(v)),
  };
}

storeContract("LocalStorageStore", () => new LocalStorageStore(fakeStorage()));

describe("LocalStorageStore persistence", () => {
  it("reads back what an earlier instance saved", async () => {
    const storage = fakeStorage();
    const a = new LocalStorageStore(storage);
    await a.addIntake({ name: "Coffee", mg: 96, takenAt: "2026-10-29T13:00:00.000Z" });
    const b = new LocalStorageStore(storage);
    expect((await b.listIntakes("2026-10-29T00:00:00.000Z", "2026-10-30T00:00:00.000Z")).length).toBe(1);
    expect(storage.getItem(STORAGE_KEY)).toContain("Coffee");
  });

  it("starts fresh when the saved value is corrupt", async () => {
    const storage = fakeStorage();
    storage.setItem(STORAGE_KEY, "{not json");
    const s = new LocalStorageStore(storage, "America/Toronto");
    expect((await s.getSettings()).timeZone).toBe("America/Toronto");
  });

  it("reports a full storage as a quota error", async () => {
    const full = {
      ...fakeStorage(),
      setItem: () => {
        throw Object.assign(new Error("full"), { name: "QuotaExceededError" });
      },
    } as Storage;
    const s = new LocalStorageStore(full);
    await expect(s.addIntake({ name: "Coffee", mg: 96, takenAt: "2026-10-29T13:00:00.000Z" })).rejects.toMatchObject({ code: "quota" });
  });
});
