export class SkillBook {
  static get(name) {
    if (!name) return SkillBook._basic();
    const key = String(name).trim().toLowerCase();
    if (key === "starfall") {
      return {
        name: "Starfall",
        attackPower: 40,
        animationType: "starfall",
        cost: 3,
      };
    }
    // Unknown skills default to basic
    return SkillBook._basic(name);
  }

  static _basic(name = "Basic") {
    const key = String(name || "").trim().toLowerCase();
    const isBasic = key === "basic" || name === undefined;
    return {
      name,
      attackPower: 20,
      animationType: "basic",
      // Basic attack is free; unknown named skills cost 1 by default
      cost: isBasic ? 0 : 1,
    };
  }
}


