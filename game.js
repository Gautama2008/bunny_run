// ── Elements ──────────────────────────────────────────────────
const menuScreen = document.getElementById('menuScreen');
const gameScreen = document.getElementById('gameScreen');
const canvas     = document.getElementById('gameCanvas');
const ctx        = canvas.getContext('2d');
const overlay    = document.getElementById('overlay');
const ovTitle    = document.getElementById('ov-title');
const ovBody     = document.getElementById('ov-body');
const ovRestart  = document.getElementById('ov-restart');
const ovExit     = document.getElementById('ov-exit');
const scoreEl    = document.getElementById('score-val');
const levelEl    = document.getElementById('level-badge');
const livesEl    = document.getElementById('lives');

// ── Constants (Base) ───────────────────────────────────────────
const BASE_WIDTH = 820;
const BASE_HEIGHT = 270;
const GRAVITY    = 0.55;
const JUMP_FORCE = -13;

// ── Constants (Responsive) ─────────────────────────────────────
let SCALE = 1;
let GROUND_Y = 210;
let BUNNY_W = 44;
let BUNNY_H = 54;

function updateGameConstants() {
  SCALE = canvas.height / BASE_HEIGHT;
  GROUND_Y = Math.floor(canvas.height * 0.78);
  
  // Scale bunny lebih kecil di mobile
  const isMobile = window.innerWidth <= 768;
  const scaleMultiplier = isMobile ? 0.85 : 1;
  
  BUNNY_W = Math.max(28, Math.floor(44 * SCALE * scaleMultiplier));
  BUNNY_H = Math.max(32, Math.floor(54 * SCALE * scaleMultiplier));
}

// ── Setup Canvas Responsif ────────────────────────────────────
function setupCanvas() {
  const hudHeight = 80;
  const availableHeight = window.innerHeight - hudHeight - 32;
  const availableWidth = window.innerWidth - 24;
  
  const isMobile = window.innerWidth <= 768;
  
  let canvasWidth, canvasHeight;
  
  if (isMobile) {
    // Mobile: hanya setengah layar (50%)
    const targetRatio = 16 / 5;
    const maxHeight = Math.min(availableHeight * 0.5, Math.floor(window.innerWidth * 0.4));
    canvasHeight = maxHeight;
    canvasWidth = Math.floor(canvasHeight * targetRatio);
  } else {
    // Desktop: ukuran normal penuh
    const targetRatio = 16 / 5;
    canvasHeight = Math.min(availableHeight, Math.floor(availableWidth / targetRatio));
    canvasWidth = Math.floor(canvasHeight * targetRatio);
  }
  
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  
  updateGameConstants();

  // Pastikan canvas ditampilkan sesuai ukuran container (CSS)
  // gunakan style width/height 100% supaya canvas merespon ukuran box di mobile
  canvas.style.width = '100%';
  canvas.style.height = '100%';

  return { canvasWidth, canvasHeight };
}

// Setup awal dan saat resize
window.addEventListener('resize', () => {
  if (gameRunning) setupCanvas();
});

const { canvasWidth, canvasHeight } = setupCanvas();

// ── Level config ──────────────────────────────────────────────
const LEVELS = [
  {
    speed: 5, spawnRate: 110, flyChance: 0,
    bgTop: '#87CEEB', bgBot: '#c8f5a0', groundColor: '#5DBB63',
    obstacleColors: ['#e74c3c', '#e67e22'],
    lives: 3, label: 'Level 1 – Padang Rumput'
  },
  {
    speed: 7, spawnRate: 95, flyChance: 0,
    bgTop: '#FFD700', bgBot: '#FFA500', groundColor: '#cc7a00',
    obstacleColors: ['#9b59b6', '#2ecc71', '#e74c3c'],
    lives: 3, label: 'Level 2 – Padang Pasir'
  },
  {
    speed: 9, spawnRate: 80, flyChance: 0.25,
    bgTop: '#FF6B9D', bgBot: '#C44569', groundColor: '#8e1a3d',
    obstacleColors: ['#00cec9', '#fdcb6e', '#e17055'],
    lives: 3, label: 'Level 3 – Hutan Merah'
  },
  {
    speed: 11, spawnRate: 65, flyChance: 0.35,
    bgTop: '#2d3436', bgBot: '#6c5ce7', groundColor: '#4a00a0',
    obstacleColors: ['#fd79a8', '#55efc4', '#a29bfe'],
    lives: 2, label: 'Level 4 – Galaksi Ungu'
  },
  {
    speed: 14, spawnRate: 50, flyChance: 0.45,
    bgTop: '#0f0c29', bgBot: '#302b63', groundColor: '#24243e',
    obstacleColors: ['#e17055', '#74b9ff', '#a29bfe', '#fd79a8'],
    lives: 1, label: 'Level 5 – Malam Abadi'
  },
];

// ── State ─────────────────────────────────────────────────────
let bunny, obstacles, clouds, score, level, lives, gameRunning, animId, frameCount, invincible, startLevel;

// ── Init ──────────────────────────────────────────────────────
function initGame(startLv) {
  startLevel = startLv;
  level      = startLv;
  bunny      = { x: Math.floor(canvasWidth * 0.08), y: GROUND_Y - BUNNY_H, vy: 0, onGround: true, jumpCount: 0 };
  obstacles  = [];
  clouds     = [
    { x: canvasWidth * 0.24, y: canvasHeight * 0.14, w: canvasWidth * 0.08 },
    { x: canvasWidth * 0.61, y: canvasHeight * 0.09, w: canvasWidth * 0.11 },
    { x: canvasWidth * 0.88, y: canvasHeight * 0.2, w: canvasWidth * 0.07 }
  ];
  score      = 0;
  lives      = LEVELS[level].lives;
  frameCount = 0;
  invincible = 0;
  updateHUD();
}

function updateHUD() {
  scoreEl.textContent = Math.floor(score);
  levelEl.textContent = LEVELS[level].label;
  livesEl.textContent = '❤️'.repeat(lives) + '🖤'.repeat(LEVELS[startLevel].lives - lives);
}

// ── Draw: Background ──────────────────────────────────────────
function drawBackground() {
  const cfg  = LEVELS[level];
  // Sky gradient dengan smooth transition
  const grad = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
  grad.addColorStop(0, cfg.bgTop);
  grad.addColorStop(0.5, adjustColorBrightness(cfg.bgTop, 0.96));
  grad.addColorStop(1, cfg.bgBot);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, GROUND_Y);
  
  // Ground dengan multi-layer sophisticated gradient
  const groundGrad = ctx.createLinearGradient(0, GROUND_Y, 0, canvas.height);
  groundGrad.addColorStop(0, cfg.groundColor);
  groundGrad.addColorStop(0.4, cfg.groundColor);
  groundGrad.addColorStop(1, adjustColorBrightness(cfg.groundColor, 0.65));
  ctx.fillStyle = groundGrad;
  ctx.fillRect(0, GROUND_Y, canvas.width, canvas.height - GROUND_Y);
  
  // Elegant grass line dengan shadow
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 4;
  ctx.strokeStyle = 'rgba(0,0,0,0.35)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y);
  ctx.lineTo(canvas.width, GROUND_Y);
  ctx.stroke();
  
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  
  // Highlight line di atas grass
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, GROUND_Y - 2);
  ctx.lineTo(canvas.width, GROUND_Y - 2);
  ctx.stroke();
  
  // Animated grass texture pattern dengan wave effect - optimized untuk mobile
  const isMobile = window.innerWidth <= 768;
  ctx.strokeStyle = 'rgba(0,0,0,0.12)';
  ctx.lineWidth = isMobile ? 0.5 : 0.8;
  const grassSpacing = isMobile ? 16 : 10; // spacing lebih lebar untuk mobile
  
  for (let i = 0; i < canvas.width; i += grassSpacing) {
    const wave = Math.sin(i * 0.08 + frameCount * 0.03) * (isMobile ? 0.8 : 1.5);
    const h1 = (isMobile ? 1.5 : 2.5) + wave;
    const h2 = (isMobile ? 1 : 1.8) + wave * 0.7;
    
    ctx.beginPath();
    ctx.moveTo(i, GROUND_Y);
    ctx.lineTo(i + 3, GROUND_Y + h1);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(i + 5, GROUND_Y);
    ctx.lineTo(i + 8, GROUND_Y + h2);
    ctx.stroke();
  }
}

// ── Draw: Clouds ──────────────────────────────────────────────
function drawClouds() {
  const isMobile = window.innerWidth <= 768;
  
  clouds.forEach((c, idx) => {
    // Animasi clouds bergerak naik turun
    const floatY = Math.sin(frameCount * 0.015 + idx) * (isMobile ? 2 : 4);
    const cy = c.y + floatY;
    
    // Shadow bawah cloud
    ctx.shadowColor = 'rgba(0,0,0,0.2)';
    ctx.shadowBlur = isMobile ? 8 : 12;
    ctx.shadowOffsetY = isMobile ? 3 : 5;
    
    // Cloud dengan gradient yang lebih elegant - lebih kecil di mobile
    const cloudScale = isMobile ? 0.8 : 1;
    const cloudGrad = ctx.createRadialGradient(c.x, cy - 6, 0, c.x, cy, c.w * 0.65 * cloudScale);
    cloudGrad.addColorStop(0, 'rgba(255,255,255,0.95)');
    cloudGrad.addColorStop(0.6, 'rgba(255,255,255,0.75)');
    cloudGrad.addColorStop(1, 'rgba(255,255,255,0.5)');
    ctx.fillStyle = cloudGrad;
    
    ctx.beginPath();
    ctx.ellipse(c.x, cy, (c.w / 2) * cloudScale, 19 * cloudScale, 0, 0, Math.PI * 2);
    ctx.ellipse(c.x - c.w * 0.2 * cloudScale, cy + 9 * cloudScale, c.w * 0.32 * cloudScale, 15 * cloudScale, 0, 0, Math.PI * 2);
    ctx.ellipse(c.x + c.w * 0.2 * cloudScale, cy + 9 * cloudScale, c.w * 0.32 * cloudScale, 15 * cloudScale, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Highlight di atas cloud dengan gradient
    const highlightGrad = ctx.createLinearGradient(c.x - c.w * 0.15, cy - 8, c.x + c.w * 0.15, cy - 8);
    highlightGrad.addColorStop(0, 'rgba(255,255,255,0)');
    highlightGrad.addColorStop(0.5, 'rgba(255,255,255,0.6)');
    highlightGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = highlightGrad;
    ctx.beginPath();
    ctx.ellipse(c.x, cy - 7, c.w * 0.25 * cloudScale, 4 * cloudScale, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Small shine spots
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath();
    ctx.ellipse(c.x - c.w * 0.1, cy - 4, 3 * cloudScale, 3 * cloudScale, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
  });
}

// ── Draw: Bunny ───────────────────────────────────────────────
function drawBunny() {
  const x = bunny.x, y = bunny.y;
  if (invincible > 0 && Math.floor(invincible / 4) % 2 === 0) return;

  const isMobile = window.innerWidth <= 768;

  // Deep shadow - reduced pada mobile
  ctx.shadowColor = 'rgba(0,0,0,0.3)';
  ctx.shadowBlur = isMobile ? 10 : 15;
  ctx.shadowOffsetY = isMobile ? 4 : 6;
  
  // ===== BODY =====
  const bodyGrad = ctx.createRadialGradient(x + BUNNY_W * 0.5, y + BUNNY_H * 0.5, 2, x + BUNNY_W * 0.5, y + BUNNY_H * 0.65, BUNNY_W * 0.6);
  bodyGrad.addColorStop(0, '#ffffff');
  bodyGrad.addColorStop(0.6, '#fafafa');
  bodyGrad.addColorStop(1, '#f0f0f0');
  
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.ellipse(x + BUNNY_W / 2, y + BUNNY_H * 0.65, BUNNY_W * 0.45, BUNNY_H * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Body outline
  ctx.strokeStyle = 'rgba(200, 200, 200, 0.4)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  
  // ===== HEAD =====
  const headGrad = ctx.createRadialGradient(x + BUNNY_W * 0.5, y + BUNNY_H * 0.25, 1, x + BUNNY_W * 0.5, y + BUNNY_H * 0.3, BUNNY_W * 0.38);
  headGrad.addColorStop(0, '#ffffff');
  headGrad.addColorStop(0.5, '#fcfcfc');
  headGrad.addColorStop(1, '#efefef');
  ctx.fillStyle = headGrad;
  ctx.beginPath();
  ctx.ellipse(x + BUNNY_W / 2, y + BUNNY_H * 0.28, BUNNY_W * 0.36, BUNNY_H * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Head outline
  ctx.strokeStyle = 'rgba(200, 200, 200, 0.35)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  
  // ===== EARS dengan inner detail =====
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.ellipse(x + BUNNY_W * 0.32, y + BUNNY_H * 0.05, 6.5, 18, -0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x + BUNNY_W * 0.68, y + BUNNY_H * 0.02, 6.5, 18, 0.25, 0, Math.PI * 2);
  ctx.fill();
  
  // Inner ear dengan gradient pink
  const earGrad = ctx.createLinearGradient(x + BUNNY_W * 0.32, y + BUNNY_H * 0.05 - 15, x + BUNNY_W * 0.32, y + BUNNY_H * 0.05 + 3);
  earGrad.addColorStop(0, '#ffc0d9');
  earGrad.addColorStop(1, '#ffb3c6');
  ctx.fillStyle = earGrad;
  ctx.beginPath();
  ctx.ellipse(x + BUNNY_W * 0.32, y + BUNNY_H * 0.05, 3.5, 12, -0.25, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.fillStyle = earGrad;
  ctx.beginPath();
  ctx.ellipse(x + BUNNY_W * 0.68, y + BUNNY_H * 0.02, 3.5, 12, 0.25, 0, Math.PI * 2);
  ctx.fill();
  
  // Ear outline
  ctx.strokeStyle = 'rgba(255, 150, 180, 0.3)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(x + BUNNY_W * 0.32, y + BUNNY_H * 0.05, 6.5, 18, -0.25, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(x + BUNNY_W * 0.68, y + BUNNY_H * 0.02, 6.5, 18, 0.25, 0, Math.PI * 2);
  ctx.stroke();
  
  // ===== EYES dengan shine =====
  // Mata kanan
  ctx.fillStyle = '#2d3436';
  ctx.beginPath();
  ctx.arc(x + BUNNY_W * 0.6, y + BUNNY_H * 0.25, 4, 0, Math.PI * 2);
  ctx.fill();
  
  // Pupil shine
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(x + BUNNY_W * 0.62, y + BUNNY_H * 0.235, 1.5, 0, Math.PI * 2);
  ctx.fill();
  
  // Eye shine secondary
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.beginPath();
  ctx.arc(x + BUNNY_W * 0.68, y + BUNNY_H * 0.22, 0.7, 0, Math.PI * 2);
  ctx.fill();
  
  // ===== NOSE dengan gradient =====
  const noseGrad = ctx.createRadialGradient(x + BUNNY_W * 0.7, y + BUNNY_H * 0.34, 0, x + BUNNY_W * 0.7, y + BUNNY_H * 0.34, 3);
  noseGrad.addColorStop(0, '#ffcfd7');
  noseGrad.addColorStop(1, '#ff9eb5');
  ctx.fillStyle = noseGrad;
  ctx.beginPath();
  ctx.arc(x + BUNNY_W * 0.7, y + BUNNY_H * 0.34, 2.8, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.strokeStyle = 'rgba(255, 150, 180, 0.5)';
  ctx.lineWidth = 0.8;
  ctx.stroke();
  
  // ===== MOUTH =====
  ctx.strokeStyle = '#d4a5a5';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(x + BUNNY_W * 0.7, y + BUNNY_H * 0.36, 1.5, 0, Math.PI, false);
  ctx.stroke();
  
  // ===== LEGS dengan animasi swing =====
  const legSwing = bunny.onGround ? Math.sin(frameCount * 0.25) * 6 : 0;
  
  const legGrad1 = ctx.createLinearGradient(x + BUNNY_W * 0.28, y + BUNNY_H * 0.8, x + BUNNY_W * 0.28, y + BUNNY_H);
  legGrad1.addColorStop(0, '#f5f5f5');
  legGrad1.addColorStop(1, '#e0e0e0');
  ctx.fillStyle = legGrad1;
  ctx.beginPath();
  ctx.ellipse(x + BUNNY_W * 0.28, y + BUNNY_H * 0.92 + legSwing, 7.5, 11, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(200, 200, 200, 0.3)';
  ctx.lineWidth = 0.8;
  ctx.stroke();
  
  const legGrad2 = ctx.createLinearGradient(x + BUNNY_W * 0.67, y + BUNNY_H * 0.8, x + BUNNY_W * 0.67, y + BUNNY_H);
  legGrad2.addColorStop(0, '#f5f5f5');
  legGrad2.addColorStop(1, '#e0e0e0');
  ctx.fillStyle = legGrad2;
  ctx.beginPath();
  ctx.ellipse(x + BUNNY_W * 0.67, y + BUNNY_H * 0.92 - legSwing, 7.5, 11, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  
  // ===== TAIL fluffy =====
  const tailGrad = ctx.createRadialGradient(x + BUNNY_W * 0.08, y + BUNNY_H * 0.6, 1, x + BUNNY_W * 0.08, y + BUNNY_H * 0.6, 9);
  tailGrad.addColorStop(0, '#ffffff');
  tailGrad.addColorStop(0.7, '#f8f8f8');
  tailGrad.addColorStop(1, '#e8e8e8');
  ctx.fillStyle = tailGrad;
  ctx.beginPath();
  ctx.arc(x + BUNNY_W * 0.08, y + BUNNY_H * 0.6, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(200, 200, 200, 0.4)';
  ctx.lineWidth = 1;
  ctx.stroke();
  
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
}

// ── Draw: Obstacle ────────────────────────────────────────────
function drawObstacle(ob) {
  const r = 8;
  const isMobile = window.innerWidth <= 768;
  
  // Heavy shadow effect - reduced pada mobile
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur = isMobile ? 10 : 16;
  ctx.shadowOffsetY = isMobile ? 4 : 6;
  
  // Gradient obstacle dengan depth lebih dalam
  const obsGrad = ctx.createLinearGradient(ob.x, ob.y, ob.x, ob.y + ob.h);
  obsGrad.addColorStop(0, ob.color);
  obsGrad.addColorStop(0.4, ob.color);
  obsGrad.addColorStop(0.6, adjustColorBrightness(ob.color, 0.85));
  obsGrad.addColorStop(1, adjustColorBrightness(ob.color, 0.6));
  ctx.fillStyle = obsGrad;
  
  // Draw obstacle dengan rounded corner
  ctx.beginPath();
  ctx.moveTo(ob.x + r, ob.y);
  ctx.lineTo(ob.x + ob.w - r, ob.y);
  ctx.quadraticCurveTo(ob.x + ob.w, ob.y, ob.x + ob.w, ob.y + r);
  ctx.lineTo(ob.x + ob.w, ob.y + ob.h - r);
  ctx.quadraticCurveTo(ob.x + ob.w, ob.y + ob.h, ob.x + ob.w - r, ob.y + ob.h);
  ctx.lineTo(ob.x + r, ob.y + ob.h);
  ctx.quadraticCurveTo(ob.x, ob.y + ob.h, ob.x, ob.y + ob.h - r);
  ctx.lineTo(ob.x, ob.y + r);
  ctx.quadraticCurveTo(ob.x, ob.y, ob.x + r, ob.y);
  ctx.closePath();
  ctx.fill();
  
  // Bold border
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  
  // Inner border/inset
  ctx.strokeStyle = 'rgba(0,0,0,0.1)';
  ctx.lineWidth = 1;
  ctx.stroke();
  
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // Top highlight gradient
  const highlightGrad = ctx.createLinearGradient(ob.x + 8, ob.y + 8, ob.x + 8, ob.y + 14);
  highlightGrad.addColorStop(0, 'rgba(255,255,255,0.35)');
  highlightGrad.addColorStop(1, 'rgba(255,255,255,0.05)');
  ctx.fillStyle = highlightGrad;
  ctx.fillRect(ob.x + 8, ob.y + 8, ob.w - 16, 6);
  
  // Shine effect - large
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.beginPath();
  ctx.ellipse(ob.x + ob.w * 0.25, ob.y + ob.h * 0.25, 8, 12, 0.3, 0, Math.PI * 2);
  ctx.fill();
  
  // Shine effect - small secondary
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.beginPath();
  ctx.ellipse(ob.x + ob.w * 0.65, ob.y + ob.h * 0.35, 4, 6, -0.4, 0, Math.PI * 2);
  ctx.fill();
  
  // Pattern/texture dengan garis vertikal subtle
  ctx.strokeStyle = 'rgba(0,0,0,0.06)';
  ctx.lineWidth = 1.5;
  for (let i = ob.x + 10; i < ob.x + ob.w - 10; i += 14) {
    ctx.beginPath();
    ctx.moveTo(i, ob.y + 8);
    ctx.lineTo(i, ob.y + ob.h - 8);
    ctx.stroke();
  }

  // Flying indicator
  if (ob.flying) {
    ctx.font = 'bold 18px serif';
    ctx.fillStyle = '#fff';
    ctx.shadowColor = 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 2;
    ctx.fillText('🪽', ob.x + ob.w / 2 - 10, ob.y - 10);
    ctx.shadowBlur = 0;
  }
}

// ── Helper: Adjust Color Brightness ────────────────────────────
function adjustColorBrightness(color, factor) {
  // Parse hex or rgb
  let r, g, b;
  if (color.startsWith('#')) {
    const hex = color.replace('#', '');
    r = parseInt(hex.substr(0, 2), 16);
    g = parseInt(hex.substr(2, 2), 16);
    b = parseInt(hex.substr(4, 2), 16);
  } else if (color.startsWith('rgb')) {
    const match = color.match(/\d+/g);
    r = parseInt(match[0]);
    g = parseInt(match[1]);
    b = parseInt(match[2]);
  }
  r = Math.max(0, Math.min(255, Math.floor(r * factor)));
  g = Math.max(0, Math.min(255, Math.floor(g * factor)));
  b = Math.max(0, Math.min(255, Math.floor(b * factor)));
  return `rgb(${r}, ${g}, ${b})`;
}

// ── Draw: HUD on canvas ───────────────────────────────────────
function drawHUDCanvas() {
  const isMobile = window.innerWidth <= 768;
  const hudHeight = Math.floor(isMobile ? canvasHeight * 0.12 : canvasHeight * 0.16);
  const fontSize = isMobile ? Math.max(10, Math.floor(canvasHeight * 0.05)) : Math.max(12, Math.floor(canvasHeight * 0.07));
  
  // Smooth background dengan gradient
  const hudGrad = ctx.createLinearGradient(0, canvas.height - hudHeight, 0, canvas.height);
  hudGrad.addColorStop(0, 'rgba(0,0,0,0.3)');
  hudGrad.addColorStop(1, 'rgba(0,0,0,0.4)');
  ctx.fillStyle = hudGrad;
  ctx.fillRect(0, canvas.height - hudHeight, canvas.width, hudHeight);
  
  // Top border garis
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, canvas.height - hudHeight);
  ctx.lineTo(canvas.width, canvas.height - hudHeight);
  ctx.stroke();
  
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${fontSize}px Segoe UI`;
  ctx.textAlign = 'left';
  
  if (isMobile) {
    // Mobile: single line lebih compact
    ctx.fillText(`Skor: ${Math.floor(score)}`, fontSize / 2 + 4, canvas.height - fontSize / 2.2);
  } else {
    // Desktop: lebih spaced
    ctx.fillText(`Skor: ${Math.floor(score)}`, fontSize / 2 + 8, canvas.height - fontSize / 2.5);
    ctx.textAlign = 'center';
    ctx.font = `${fontSize * 0.85}px Segoe UI`;
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillText('Kontrol: SPASI / ↑ / Klik  |  Double Jump tersedia', canvas.width / 2, canvas.height - fontSize / 2.5);
  }
}

// ── Spawn obstacle ────────────────────────────────────────────
function spawnObstacle() {
  const cfg    = LEVELS[level];
  const color  = cfg.obstacleColors[Math.floor(Math.random() * cfg.obstacleColors.length)];
  
  // Obstacle size scale - lebih kecil di mobile
  const isMobile = window.innerWidth <= 768;
  const sizeScale = isMobile ? 0.8 : 1;
  
  const h      = Math.floor((28 + Math.random() * 44) * SCALE * sizeScale);
  const w      = Math.floor((20 + Math.random() * 22) * SCALE * sizeScale);
  const flying = Math.random() < cfg.flyChance;
  const y      = flying ? GROUND_Y - h - Math.floor(55 * SCALE) - Math.random() * Math.floor(35 * SCALE) : GROUND_Y - h;
  obstacles.push({ x: canvas.width + 10, y, w, h, color, flying });
}

// ── Collision ─────────────────────────────────────────────────
function checkCollision(ob) {
  const m = 8;
  return (
    bunny.x + m       < ob.x + ob.w &&
    bunny.x + BUNNY_W - m > ob.x    &&
    bunny.y + m       < ob.y + ob.h &&
    bunny.y + BUNNY_H - m > ob.y
  );
}

// ── Jump ──────────────────────────────────────────────────────
function jump() {
  if (bunny.jumpCount < 2) {
    bunny.vy = JUMP_FORCE;
    bunny.onGround = false;
    bunny.jumpCount++;
  }
}

// ── Game loop ─────────────────────────────────────────────────
function gameLoop() {
  if (!gameRunning) return;
  frameCount++;
  const cfg = LEVELS[level];

  score += 0.12 * (level + 1);
  updateHUD();

  if (frameCount % cfg.spawnRate === 0) spawnObstacle();

  obstacles.forEach(ob => ob.x -= cfg.speed);
  obstacles = obstacles.filter(ob => ob.x + ob.w > 0);

  clouds.forEach(c => { c.x -= 0.7; if (c.x + c.w < 0) c.x = canvas.width + c.w; });

  bunny.vy += GRAVITY;
  bunny.y  += bunny.vy;
  if (bunny.y >= GROUND_Y - BUNNY_H) {
    bunny.y        = GROUND_Y - BUNNY_H;
    bunny.vy       = 0;
    bunny.onGround = true;
    bunny.jumpCount = 0;
  }

  if (invincible > 0) {
    invincible--;
  } else {
    for (const ob of obstacles) {
      if (checkCollision(ob)) {
        lives--;
        invincible = 80;
        updateHUD();
        if (lives <= 0) { gameOver(); return; }
        break;
      }
    }
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBackground();
  drawClouds();
  obstacles.forEach(drawObstacle);
  drawBunny();
  drawHUDCanvas();

  animId = requestAnimationFrame(gameLoop);
}

// ── Game over ─────────────────────────────────────────────────
function gameOver() {
  gameRunning = false;
  cancelAnimationFrame(animId);
  ovTitle.textContent   = '💀 Game Over!';
  ovBody.innerHTML      = `Skor akhir: <strong>${Math.floor(score)}</strong> &nbsp;|&nbsp; ${LEVELS[level].label}`;
  overlay.style.display = 'flex';
}

// ── Start game ────────────────────────────────────────────────
function startGame(lv) {
  menuScreen.style.display = 'none';
  gameScreen.style.display = 'flex';
  gameScreen.classList.add('playing');
  overlay.style.display    = 'none';
  
  // Setup canvas untuk ukuran baru
  setupCanvas();
  
  initGame(lv);
  gameRunning = true;
  gameLoop();
}

// ── Overlay buttons ───────────────────────────────────────────
ovRestart.addEventListener('click', () => {
  overlay.style.display = 'none';
  gameScreen.classList.add('playing');
  
  // Setup canvas
  setupCanvas();
  
  initGame(startLevel);
  gameRunning = true;
  gameLoop();
});

ovExit.addEventListener('click', () => {
  gameRunning = false;
  cancelAnimationFrame(animId);
  overlay.style.display    = 'none';
  gameScreen.classList.remove('playing');
  gameScreen.style.display = 'none';
  menuScreen.style.display = 'flex';
});

// ── Input ─────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if ((e.code === 'Space' || e.code === 'ArrowUp') && gameRunning) {
    e.preventDefault();
    jump();
  }
});
canvas.addEventListener('click',      () => { if (gameRunning) jump(); });
canvas.addEventListener('touchstart', e => { e.preventDefault(); if (gameRunning) jump(); }, { passive: false });
