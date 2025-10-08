import {GameObject} from "../../GameObject.js";
import {Vector2} from "../../Vector2.js";
import {SkillBook} from "./SkillBook.js";

export class SkillCross extends GameObject {
  constructor({ hero, battle }) {
    super({});
    this.hero = hero;
    this.battle = battle;
    this.active = false;
    this.selected = null;
    this.radius = 8;
    this.gap = 18;
    this.centerOffset = new Vector2(38, 2);
    this.isExpanded = false;
    this.targetExpanded = false;
    this.animT = 0;
    this.animSpeed = 0.012;
  }
  setSelected(letter) {
    this.selected = letter;
  }
  reset() {
    this.selected = null;
  }
  toggle() {
    this.targetExpanded = !this.targetExpanded;
    this.isExpanded = this.targetExpanded;
  }
  setExpanded(expanded, immediate = false) {
    this.targetExpanded = !!expanded;
    this.isExpanded = this.targetExpanded;
    if (immediate) {
      this.animT = this.targetExpanded ? 1 : 0;
    }
  }
  collapseImmediate() {
    this.setExpanded(false, true);
  }
  collapse() {
    this.setExpanded(false, false);
  }
  step(delta) {
    const target = this.targetExpanded ? 1 : 0;
    if (this.animT !== target) {
      const dir = Math.sign(target - this.animT);
      this.animT = Math.max(0, Math.min(1, this.animT + dir * this.animSpeed * delta));
    }
  }
  drawImage(ctx, x, y) {
    if (!this.active) return;

    const cx = Math.round(x + this.centerOffset.x);
    const cy = Math.round(y + this.centerOffset.y);

    const ease = (t) => 1 - Math.pow(1 - t, 3);
    const dist = Math.round(this.gap * ease(this.animT));

    const nodes = [
      { letter: "W", px: cx, py: cy - dist },
      { letter: "D", px: cx + dist, py: cy },
      { letter: "X", px: cx, py: cy + dist },
      { letter: "A", px: cx - dist, py: cy },
    ];

    const availablePoints = this.battle?.skillPoints ?? 0;

    const drawNode = (node) => {
      const isSelected = !!this.selected && this.selected === node.letter;
      const dimOthers = !!this.selected && !isSelected;
      const skill = this._getSkillForLetter(node.letter);
      const cost = SkillBook.get(skill?.name)?.cost ?? 1;
      const affordable = cost <= availablePoints;

      ctx.save();
      const baseAlpha = this.animT <= 0 ? 0 : 1.0;
      const unavailableAlpha = affordable ? 1.0 : 0.4;
      ctx.globalAlpha = (dimOthers ? 0.25 : 1.0) * baseAlpha * unavailableAlpha;

      ctx.fillStyle = isSelected ? "#FFE08A" : "#FFFFFF";
      ctx.strokeStyle = isSelected ? "#FF9E3B" : "#222222";
      ctx.lineWidth = isSelected ? 2 : 1;
      ctx.beginPath();
      ctx.arc(node.px, node.py, this.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = isSelected ? "#4A2C00" : "#111111";
      ctx.font = "bold 8px 'Retro Gaming', monospace";
      ctx.textBaseline = "middle";
      ctx.textAlign = "center";
      ctx.fillText(node.letter, node.px, node.py + 0.5);
      ctx.restore();
    };

    if (this.animT > 0) {
      nodes.forEach(drawNode);
    }

    if (this.selected && this.animT > 0) {
      const selectedNode = nodes.find(n => n.letter === this.selected);
      const skill = this._getSkillForLetter(this.selected);
      const sb = SkillBook.get(skill?.name);
      const label = sb?.name ?? "";
      const cost = sb?.cost ?? 1;
      if (label) {
        const labelX = selectedNode.px + this.radius + 6;
        const labelY = selectedNode.py - 5;

        ctx.save();
        ctx.fillStyle = "#000000";
        ctx.globalAlpha = 0.6;
        ctx.font = "bold 8px 'Retro Gaming', monospace";
        ctx.textBaseline = "top";
        ctx.fillText((label + ` (${cost})`).toUpperCase(), labelX + 1, labelY + 1);

        ctx.globalAlpha = 1.0;
        ctx.fillStyle = "#FFE08A";
        ctx.fillText((label + ` (${cost})`).toUpperCase(), labelX, labelY);
        ctx.restore();
      }
    }

    ctx.save();
    const isSelectedCenter = false;
    const dimCenter = !!this.selected;
    ctx.globalAlpha = dimCenter ? 0.25 : 1.0;
    ctx.fillStyle = isSelectedCenter ? "#FFE08A" : "#FFFFFF";
    ctx.strokeStyle = isSelectedCenter ? "#FF9E3B" : "#222222";
    ctx.lineWidth = isSelectedCenter ? 2 : 1;
    ctx.beginPath();
    ctx.arc(cx, cy, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#111111";
    ctx.font = "bold 8px 'Retro Gaming', monospace";
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.fillText("S", cx, cy + 0.5);
    ctx.restore();
  }
  _getSkillForLetter(letter) {
    const h = this.hero;
    if (!h?.skills) return null;
    if (letter === "W") return h.skills.top;
    if (letter === "D") return h.skills.right;
    if (letter === "X") return h.skills.bottom;
    if (letter === "A") return h.skills.left;
    return null;
  }
}
 

