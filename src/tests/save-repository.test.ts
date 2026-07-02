import { describe, expect, it } from "vitest";
import { createDefaultSaveData } from "../game/state/SaveData";
import {
  CORRUPT_BACKUP_KEY,
  LocalStorageSaveRepository,
  SAVE_KEY,
} from "../game/save/LocalStorageSaveRepository";

function fakeStorage(): Storage {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => (map.has(key) ? (map.get(key) as string) : null),
    setItem: (key: string, value: string) => {
      map.set(key, String(value));
    },
    removeItem: (key: string) => {
      map.delete(key);
    },
    clear: () => map.clear(),
    key: (index: number) => [...map.keys()][index] ?? null,
    get length() {
      return map.size;
    },
  } as Storage;
}

describe("LocalStorageSaveRepository", () => {
  it("returns the default save when nothing is stored", () => {
    const repo = new LocalStorageSaveRepository(fakeStorage());
    expect(repo.load()).toEqual(createDefaultSaveData());
  });

  it("round-trips a saved snapshot", () => {
    const storage = fakeStorage();
    const repo = new LocalStorageSaveRepository(storage);
    const save = createDefaultSaveData();
    save.player.coins = 777;
    save.shop.greedyCoinLevel = 6;
    repo.save(save);
    expect(repo.load()).toEqual(save);
  });

  it("backs up a corrupt payload and falls back to the default save", () => {
    const storage = fakeStorage();
    storage.setItem(SAVE_KEY, "{not valid json");
    const repo = new LocalStorageSaveRepository(storage);
    expect(repo.load()).toEqual(createDefaultSaveData());
    expect(storage.getItem(CORRUPT_BACKUP_KEY)).toBe("{not valid json");
  });

  it("clears the stored save", () => {
    const storage = fakeStorage();
    const repo = new LocalStorageSaveRepository(storage);
    repo.save(createDefaultSaveData());
    repo.clear();
    expect(storage.getItem(SAVE_KEY)).toBeNull();
  });

  it("survives a throwing storage without crashing", () => {
    const throwingStorage = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
    } as unknown as Storage;
    const repo = new LocalStorageSaveRepository(throwingStorage);
    expect(repo.load()).toEqual(createDefaultSaveData());
    expect(() => repo.save(createDefaultSaveData())).not.toThrow();
    expect(() => repo.clear()).not.toThrow();
  });
});
