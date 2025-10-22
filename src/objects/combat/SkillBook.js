import {StarfallSkillAnimation} from "./skills/StarfallSkillAnimation.js";
import {BasicAttackSkillAnimation} from "./skills/BasicAttackSkillAnimation.js";
import {KrakatoaSkillAnimation} from "./skills/KrakatoaSkillAnimation.js";

export class SkillBook {
  static get(name) {
    if (!name) return SkillBook._basic();
    const key = String(name).trim().toLowerCase();
    if (key === "starfall") {
      return {
        name: "Starfall",
        attackPower: 40,
        animationType: "starfall",
        cost: 0,
      };
    }
    if (key === "krakatoa") {
      return {
        name: "Krakatoa",
        attackPower: 65,
        animationType: "krakatoa",
        cost: 0,
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

  /**
   * Creates a skill animation instance based on the skill name
   * @param {string} skillName - Name of the skill
   * @param {object} params - Parameters for the animation
   * @param {object} params.battle - Reference to BattleScene
   * @param {object} params.attacker - The attacking character
   * @param {object} params.target - The target character
   * @param {object} params.attackerStartPosition - Starting position of attacker
   * @param {object} params.targetStartPosition - Starting position of target
   * @param {boolean} params.applyDamageOnImpact - Whether to apply damage automatically (optional)
   * @returns {SkillAnimation} The skill animation instance
   */
  static createAnimation(skillName, params) {
    const skill = SkillBook.get(skillName);
    const animParams = {
      battle: params.battle,
      attacker: params.attacker,
      target: params.target,
      skill: skill,
      attackerStartPosition: params.attackerStartPosition,
      targetStartPosition: params.targetStartPosition,
      applyDamageOnImpact: params.applyDamageOnImpact
    };

    // Determine which animation class to use based on animationType
    switch (skill.animationType) {
      case "starfall":
        return new StarfallSkillAnimation(animParams);
      case "krakatoa":
        return new KrakatoaSkillAnimation(animParams);
      case "basic":
      default:
        return new BasicAttackSkillAnimation(animParams);
    }
  }
}


