import {SkillAnimation} from "../SkillAnimation.js";
import {GameObject} from "../../../GameObject.js";
import {Vector2} from "../../../Vector2.js";
import {FlashOverlay} from "../FlashOverlay.js";
import {SliceEffect} from "../SliceEffect.js";
import {audio} from "../../../Audio.js";

/**
 * Cyclone particle that spirals inward and then flies with the beam
 */
class CycloneParticle {
  constructor(startX, startY, targetX, targetY, height, speed) {
    this.startX = startX;
    this.startY = startY;
    this.x = startX;
    this.y = startY;
    this.targetX = targetX;
    this.targetY = targetY;
    this.height = height; // position in cyclone ring (0 to 1)
    this.speed = speed;
    this.radius = 1 + Math.random() * 1.5;
    this.color = Math.random() > 0.5 ? "#FF0000" : "#FF4400";
    this.alpha = 0.8 + Math.random() * 0.2;
    
    // Cyclone motion - start at different angles for circular distribution
    this.angle = height * Math.PI * 2 + Math.random() * 0.5; // Distribute evenly around circle
    this.spiralRadius = 50 + Math.random() * 30;
    this.spiralSpeed = 0.012 + Math.random() * 0.008; // Varied rotation speeds
    
    // For beam phase
    this.beamProgress = 0;
    this.beamStartX = 0;
    this.beamStartY = 0;
    this.beamEndX = 0;
    this.beamEndY = 0;
    this.beamOffset = Math.random() * 0.3; // stagger release
  }

  update(delta, phase, heroX, heroY) {
    if (phase === "charge") {
      // Dramatic cyclone spiral inward
      this.angle += this.spiralSpeed * delta;
      this.spiralRadius = Math.max(0, this.spiralRadius - this.speed * delta * 0.15);
      
      // Position in circular spiral
      this.x = heroX + Math.cos(this.angle) * this.spiralRadius;
      this.y = heroY + Math.sin(this.angle) * this.spiralRadius;
      
      // Fade in as they get closer
      const closeness = 1 - (this.spiralRadius / 80);
      this.alpha = 0.3 + closeness * 0.7;
      
    } else if (phase === "release" || phase === "impact") {
      // Fly with the beam towards enemy
      this.beamProgress = Math.min(1, this.beamProgress + delta * 0.003);
      
      const adjustedProgress = Math.max(0, this.beamProgress - this.beamOffset);
      const t = Math.min(1, adjustedProgress * 1.5);
      
      // Travel along beam path with slight wave
      this.x = this.beamStartX + (this.beamEndX - this.beamStartX) * t;
      this.y = this.beamStartY + (this.beamEndY - this.beamStartY) * t;
      
      // Add wavy motion
      const perpAngle = Math.atan2(this.beamEndY - this.beamStartY, this.beamEndX - this.beamStartX) + Math.PI / 2;
      const waveAmount = Math.sin(t * Math.PI * 3 + this.angle) * 3;
      this.x += Math.cos(perpAngle) * waveAmount;
      this.y += Math.sin(perpAngle) * waveAmount;
      
      // Fade out near the end
      if (t > 0.7) {
        this.alpha = 1 - (t - 0.7) / 0.3;
      }
    }
  }

  startBeamFlight(startX, startY, endX, endY) {
    this.beamStartX = startX;
    this.beamStartY = startY;
    this.beamEndX = endX;
    this.beamEndY = endY;
    this.beamProgress = 0;
  }

  draw(ctx) {
    if (this.alpha <= 0) return;
    
    ctx.save();
    ctx.globalAlpha = this.alpha;
    
    // Draw glow
    const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius * 2.5);
    gradient.addColorStop(0, this.color);
    gradient.addColorStop(0.4, `${this.color}AA`);
    gradient.addColorStop(1, `${this.color}00`);
    
    ctx.fillStyle = gradient;
    ctx.fillRect(this.x - this.radius * 2.5, this.y - this.radius * 2.5, this.radius * 5, this.radius * 5);
    
    // Draw core
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  }
}

/**
 * Container GameObject that renders all cyclone particles
 */
class CycloneParticleContainer extends GameObject {
  constructor(particles, animationRef) {
    super({ position: new Vector2(0, 0) });
    this.particles = particles;
    this.animationRef = animationRef; // Reference to the animation for phase/position info
  }

  step(delta) {
    // Particles are updated by the animation itself
  }

  drawImage(ctx, x, y) {
    // Draw all particles
    this.particles.forEach(p => p.draw(ctx));
  }
}

/**
 * Beam effect for the release phase
 */
class BeamEffect extends GameObject {
  constructor(startX, startY, endX, endY, duration = 400) {
    super({ position: new Vector2(0, 0) });
    this.startX = startX;
    this.startY = startY;
    this.endX = endX;
    this.endY = endY;
    this.duration = duration;
    this.elapsed = 0;
    this.width = 0;
    this.maxWidth = 16;
  }

  step(delta) {
    this.elapsed += delta;
    
    // Beam width animation: quick expand, then fade
    const progress = this.elapsed / this.duration;
    if (progress < 0.2) {
      this.width = (progress / 0.2) * this.maxWidth;
    } else if (progress < 0.7) {
      this.width = this.maxWidth;
    } else {
      this.width = this.maxWidth * (1 - (progress - 0.7) / 0.3);
    }
    
    if (this.elapsed >= this.duration) {
      this.destroy();
    }
  }

  drawImage(ctx, x, y) {
    if (this.width <= 0) return;
    
    const dx = this.endX - this.startX;
    const dy = this.endY - this.startY;
    const angle = Math.atan2(dy, dx);
    const dist = Math.hypot(dx, dy);
    
    ctx.save();
    ctx.translate(this.startX, this.startY);
    ctx.rotate(angle);
    
    // Draw glow layers
    const progress = this.elapsed / this.duration;
    const alpha = progress < 0.1 ? progress / 0.1 : (progress < 0.8 ? 1 : 1 - (progress - 0.8) / 0.2);
    
    // Outer glow
    ctx.globalAlpha = alpha * 0.3;
    const outerGradient = ctx.createLinearGradient(0, -this.width * 2, 0, this.width * 2);
    outerGradient.addColorStop(0, "#FF000000");
    outerGradient.addColorStop(0.5, "#FF0000");
    outerGradient.addColorStop(1, "#FF000000");
    ctx.fillStyle = outerGradient;
    ctx.fillRect(0, -this.width * 2, dist, this.width * 4);
    
    // Middle layer
    ctx.globalAlpha = alpha * 0.6;
    const midGradient = ctx.createLinearGradient(0, -this.width * 1.2, 0, this.width * 1.2);
    midGradient.addColorStop(0, "#FF440000");
    midGradient.addColorStop(0.5, "#FF4400");
    midGradient.addColorStop(1, "#FF440000");
    ctx.fillStyle = midGradient;
    ctx.fillRect(0, -this.width * 1.2, dist, this.width * 2.4);
    
    // Core beam
    ctx.globalAlpha = alpha;
    const coreGradient = ctx.createLinearGradient(0, -this.width * 0.6, 0, this.width * 0.6);
    coreGradient.addColorStop(0, "#FFAA0000");
    coreGradient.addColorStop(0.3, "#FFAA00");
    coreGradient.addColorStop(0.5, "#FFFF66");
    coreGradient.addColorStop(0.7, "#FFAA00");
    coreGradient.addColorStop(1, "#FFAA0000");
    ctx.fillStyle = coreGradient;
    ctx.fillRect(0, -this.width * 0.6, dist, this.width * 1.2);
    
    // Energy particles along the beam
    ctx.globalAlpha = alpha;
    for (let i = 0; i < 8; i++) {
      const t = (i / 8 + this.elapsed * 0.01) % 1;
      const px = t * dist;
      const py = Math.sin(t * Math.PI * 4 + this.elapsed * 0.02) * this.width * 0.3;
      
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.arc(px, py, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.restore();
  }
}

/**
 * Krakatoa skill animation: Massive charging beam attack
 * Hero hovers, charges red energy particles, then releases a devastating beam
 */
export class KrakatoaSkillAnimation extends SkillAnimation {
  constructor(params = {}) {
    super(params);
    
    // Animation phases: idle | hover | charge | release | impact | retreat
    this.phase = "idle";
    
    // Configurable parameters
    this.hoverHeight = 20;
    this.hoverSpeed = 0.08;
    this.chargeDuration = 1200;
    this.releaseDuration = 400;
    this.impactDuration = 300;
    this.retreatSpeed = 0.4;
    
    // State tracking
    this.timer = 0;
    this.cycloneParticles = [];
    this.cycloneContainer = null;
    this.beam = null;
    this.chargeIntensity = 0;
    this.screenShakeIntensity = 0;
    
    // Sound tracking
    this.isPlayingChargeSound = false;
  }

  start() {
    // Begin hover phase
    this.phase = "hover";
    this.attacker.body.animations.play("walkUp");
    
    // Play initial power-up sound
    this.playPowerUpSound();
  }

  step(delta) {
    // Update screen shake
    if (this.screenShakeIntensity > 0) {
      this.screenShakeIntensity = Math.max(0, this.screenShakeIntensity - delta * 0.003);
    }
    
    switch (this.phase) {
      case "hover":
        this.stepHover(delta);
        break;
      case "charge":
        this.stepCharge(delta);
        break;
      case "release":
        this.stepRelease(delta);
        break;
      case "impact":
        this.stepImpact(delta);
        break;
      case "retreat":
        this.stepRetreat(delta);
        break;
    }
    
    // Update cyclone particles (adjusted position to center on hero sprite)
    const heroX = this.attacker.position.x + 4;
    const heroY = this.attacker.position.y - 4;
    this.cycloneParticles.forEach(p => p.update(delta, this.phase, heroX, heroY));
    
    return this.isComplete;
  }

  stepHover(delta) {
    // Float upward
    const targetY = this.attackerStartPosition.y - this.hoverHeight;
    const stepY = this.hoverSpeed * delta;
    this.attacker.position.y = Math.max(targetY, this.attacker.position.y - stepY);
    
    if (this.attacker.position.y <= targetY + 0.001) {
      // Begin charge phase directly
      this.phase = "charge";
      this.timer = this.chargeDuration;
      this.chargeIntensity = 0;
      this.attacker.body.animations.play("standRight");
      
      // Spawn cyclone particles
      this.spawnCycloneParticles();
      
      // Start charging sound
      this.playChargingSound();
    }
  }

  stepCharge(delta) {
    this.timer -= delta;
    
    // Increase charge intensity
    this.chargeIntensity = 1 - (this.timer / this.chargeDuration);
    
    // Add screen shake as charge builds
    this.screenShakeIntensity = this.chargeIntensity * 0.3;
    
    if (this.timer <= 0) {
      // Fully charged - release!
      this.phase = "release";
      this.timer = this.releaseDuration;
      
      // Spawn beam
      this.spawnBeam();
      
      // Make cyclone particles fly with the beam
      const heroX = this.attacker.position.x + 4;
      const heroY = this.attacker.position.y - 4;
      const targetX = this.target.position.x + 4;
      const targetY = this.target.position.y - 4;
      this.cycloneParticles.forEach(p => p.startBeamFlight(heroX, heroY, targetX, targetY));
      
      // Play beam sound
      this.playBeamSound();
      
      // Big screen shake
      this.screenShakeIntensity = 2.0;
    }
  }

  stepRelease(delta) {
    this.timer -= delta;
    
    if (this.timer <= this.releaseDuration * 0.6 && !this.hasDamaged) {
      // Deal damage when beam is at full strength
      this.applyHitEffects();
      this.hasDamaged = true;
    }
    
    if (this.timer <= 0) {
      // Move to impact phase
      this.phase = "impact";
      this.timer = this.impactDuration;
    }
  }

  stepImpact(delta) {
    this.timer -= delta;
    
    if (this.timer <= 0) {
      // Begin retreat back to start
      this.phase = "retreat";
      this.attacker.body.animations.play("walkLeft");
    }
  }

  stepRetreat(delta) {
    const dx = this.attackerStartPosition.x - this.attacker.position.x;
    const dy = this.attackerStartPosition.y - this.attacker.position.y;
    const dist = Math.hypot(dx, dy);
    
    if (dist <= 1.0) {
      // Animation complete
      this.isComplete = true;
      this.cleanup();
    } else {
      // Continue retreating
      const step = this.retreatSpeed * delta;
      const nx = dx / (dist || 1);
      const ny = dy / (dist || 1);
      const move = Math.min(step, dist);
      this.attacker.position.x += nx * move;
      this.attacker.position.y += ny * move;
    }
  }

  spawnCycloneParticles() {
    const heroX = this.attacker.position.x + 4;
    const heroY = this.attacker.position.y - 4;
    
    // Spawn ~50 particles in a cyclone pattern around the hero
    // Create multiple rings at different radii for a fuller cyclone effect
    const numParticles = 50;
    for (let i = 0; i < numParticles; i++) {
      const ringPosition = i / numParticles; // 0 to 1
      const particle = new CycloneParticle(
        heroX, heroY,
        heroX, heroY,
        ringPosition,
        0.8 + Math.random() * 0.6
      );
      this.cycloneParticles.push(particle);
    }
    
    // Add container to battle scene so particles render on top
    this.cycloneContainer = new CycloneParticleContainer(this.cycloneParticles, this);
    this.battle.addChild(this.cycloneContainer);
  }

  spawnBeam() {
    const heroX = this.attacker.position.x + 4;
    const heroY = this.attacker.position.y - 4;
    
    const targetX = this.target.position.x + 4;
    const targetY = this.target.position.y - 4;
    
    this.beam = new BeamEffect(heroX, heroY, targetX, targetY, this.releaseDuration);
    this.battle.addChild(this.beam);
  }

  applyHitEffects() {
    // Deal massive damage
    const damage = this.skill?.attackPower ?? 60;
    this.dealDamage(damage);
    
    // Add visual effects to target
    const w = this.target.sprite.frameSize.x * (this.target.sprite.scale ?? 1);
    const h = this.target.sprite.frameSize.y * (this.target.sprite.scale ?? 1);
    
    // Red flash
    const flash = new FlashOverlay({ 
      width: w, 
      height: h, 
      duration: 200,
      color: "#FF0000",
      alpha: 0.8
    });
    this.target.addChild(flash);
    
    // Add multiple slice effects for emphasis
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        const slice = new SliceEffect({ width: w, height: h, duration: 150 });
        this.target.addChild(slice);
      }, i * 60);
    }
    
    // Play impact sound
    this.playImpactSound();
  }

  // Sound effects
  playPowerUpSound() {
    if (!audio.ctx) return;
    const ctx = audio.ctx;
    const now = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = "sine";
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.3);
    
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.3, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.35);
  }

  playChargingSound() {
    if (!audio.ctx || this.isPlayingChargeSound) return;
    this.isPlayingChargeSound = true;
    
    const ctx = audio.ctx;
    const now = ctx.currentTime;
    const duration = this.chargeDuration / 1000;
    
    // Low rumble
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sawtooth";
    osc1.frequency.setValueAtTime(60, now);
    osc1.frequency.exponentialRampToValueAtTime(120, now + duration);
    gain1.gain.setValueAtTime(0.0001, now);
    gain1.gain.exponentialRampToValueAtTime(0.2, now + 0.3);
    gain1.gain.setValueAtTime(0.2, now + duration - 0.2);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + duration);
    
    // High energy whine
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(800, now);
    osc2.frequency.exponentialRampToValueAtTime(2000, now + duration);
    gain2.gain.setValueAtTime(0.0001, now + 0.4);
    gain2.gain.exponentialRampToValueAtTime(0.15, now + duration - 0.1);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.4);
    osc2.stop(now + duration);
  }

  playBeamSound() {
    if (!audio.ctx) return;
    const ctx = audio.ctx;
    const now = ctx.currentTime;
    const duration = this.releaseDuration / 1000;
    
    // Powerful blast
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sawtooth";
    osc1.frequency.setValueAtTime(150, now);
    osc1.frequency.exponentialRampToValueAtTime(80, now + duration);
    gain1.gain.setValueAtTime(0.4, now);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + duration);
    
    // High frequency sizzle
    const noiseBuffer = this.createNoiseBuffer(ctx, duration);
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = "highpass";
    noiseFilter.frequency.setValueAtTime(2000, now);
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.3, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + duration);
  }

  playImpactSound() {
    if (!audio.ctx) return;
    const ctx = audio.ctx;
    const now = ctx.currentTime;
    
    // Explosion-like impact
    const noiseBuffer = this.createNoiseBuffer(ctx, 0.4);
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = "lowpass";
    noiseFilter.frequency.setValueAtTime(800, now);
    noiseFilter.frequency.exponentialRampToValueAtTime(200, now + 0.4);
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.5, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + 0.4);
    
    // Bass thump
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(100, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.3);
    gain.gain.setValueAtTime(0.6, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.35);
  }

  createNoiseBuffer(ctx, duration) {
    const rate = ctx.sampleRate;
    const length = Math.floor(duration * rate);
    const buffer = ctx.createBuffer(1, length, rate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  cleanup() {
    super.cleanup();
    
    // Clean up particles
    this.cycloneParticles = [];
    
    // Clean up particle container
    if (this.cycloneContainer) {
      this.cycloneContainer.destroy();
      this.cycloneContainer = null;
    }
  }
}

