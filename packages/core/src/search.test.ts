import { BUILT_IN_DRINKS, matchScore, searchDrinks } from "./search";

describe("drinks.json", () => {
  it("has a source and a positive mg for every drink, with unique ids", () => {
    const ids = new Set<string>();
    for (const d of BUILT_IN_DRINKS) {
      expect(d.source.length).toBeGreaterThan(5);
      expect(d.mg).toBeGreaterThanOrEqual(0);
      expect(ids.has(d.id)).toBe(false);
      ids.add(d.id);
    }
  });
});

describe("searchDrinks", () => {
  it("lists everything for an empty query, custom drinks first", () => {
    const r = searchDrinks("", BUILT_IN_DRINKS, [{ id: "c1", name: "Office cold brew", mg: 200 }]);
    expect(r[0]).toMatchObject({ name: "Office cold brew", custom: true });
    expect(r.length).toBe(BUILT_IN_DRINKS.length + 1);
  });
  it("matches by name, case-insensitively, best first", () => {
    const names = searchDrinks("coke").map((d) => d.name);
    expect(names.slice(0, 3)).toEqual(expect.arrayContaining(["Coke Zero", "Coca-Cola", "Diet Coke"]));
    expect(names).not.toContain("Espresso");
  });
  it("matches aliases", () => {
    expect(searchDrinks("americano")[0]?.name).toBe("Coffee, brewed");
    expect(searchDrinks("energy drink")[0]?.name).toBe("Red Bull");
  });
  it("tolerates typos", () => {
    expect(searchDrinks("expresso").map((d) => d.name)).toContain("Espresso");
    expect(searchDrinks("cofee").map((d) => d.name)).toContain("Coffee, brewed");
  });
  it("returns nothing for nonsense", () => {
    expect(searchDrinks("zzzzqq")).toEqual([]);
  });
  it("scores exact over prefix over substring", () => {
    expect(matchScore("espresso", "Espresso")).toBeGreaterThan(matchScore("esp", "Espresso"));
    expect(matchScore("esp", "Espresso")).toBeGreaterThan(matchScore("press", "Espresso"));
  });
});
