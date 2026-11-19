<template>
  <q-page class="flex flex-center bg-dark text-white q-pa-sm page-responsive">
    <div class="game-wrapper column items-center q-gutter-sm">
      <div class="text-subtitle2 text-weight-bold text-amber-4">MEGA PING PONG GAME</div>
      <div class="scoreboard row items-center justify-between full-width q-pa-sm">
        <div class="column items-start score-side">
          <div class="text-caption text-grey-4 score-label">
            {{ gameMode === 'pvp' ? 'JOGADOR 2 (A / D)' : 'OPONENTE (IA)' }}
            <q-badge v-if="currentServer === 'ai'" color="rose-6" label="SAQUE" class="q-ml-xs" />
          </div>
          <div class="row items-baseline q-gutter-xs">
            <span class="text-h5 text-weight-bold text-rose-4 score-value">{{ aiScore }}</span>
            <span class="text-caption text-grey-4">Sets: {{ aiSets }}</span>
          </div>
        </div>

        <div class="column items-center score-center">
          <q-badge v-if="isDeuce" color="amber-7" text-color="dark" label="DEUCE" class="q-mb-xs" />
          <div class="text-caption text-grey-4">Melhor de 5 sets</div>
        </div>

        <div class="column items-end score-side">
          <div class="text-caption text-grey-4 score-label">
            <q-badge
              v-if="currentServer === 'player'"
              color="light-blue-6"
              label="SAQUE"
              class="q-mr-xs"
            />
            JOGADOR 1 (← / →)
          </div>
          <div class="row items-baseline q-gutter-xs">
            <span class="text-caption text-grey-4">Sets: {{ playerSets }}</span>
            <span class="text-h5 text-weight-bold text-light-blue-4 score-value">{{
              playerScore
            }}</span>
          </div>
        </div>

        <div class="row items-center justify-between q-mb-sm control-row full-width">
          <div class="text-subtitle2 text-grey-4">Modo de Jogo:</div>
          <q-toggle
            v-model="isPvPMode"
            :disable="isGameStarted && !isGameOver"
            color="purple"
            checked-icon="people"
            unchecked-icon="smart_toy"
            :label="isPvPMode ? 'Humano vs Humano' : 'Jogador vs IA'"
            left-label
            @update:model-value="updateGameMode"
          />
        </div>

        <div
          v-if="!isPvPMode"
          class="row items-center justify-between q-mb-sm control-row difficulty-row full-width"
        >
          <div class="text-subtitle2 text-grey-4">Dificuldade da IA:</div>
          <q-toggle
            v-model="isHardMode"
            :disable="isGameStarted && !isGameOver"
            color="red"
            checked-icon="whatshot"
            unchecked-icon="sentiment_satisfied"
            :label="isHardMode ? 'Difícil' : 'Fácil'"
            left-label
            @update:model-value="updateDifficulty"
          />
        </div>
      </div>

      <div class="status-banner full-width text-center q-pa-xs">
        <span class="text-caption text-weight-medium text-amber-2">{{ statusMessage }}</span>
      </div>

      <div class="canvas-container relative-position">
        <canvas ref="canvasRef" :width="CANVAS_WIDTH" :height="CANVAS_HEIGHT" class="game-canvas" />

        <div
          v-if="!isGameStarted || isGameOver"
          class="overlay column items-center justify-center q-pa-md text-center"
          :class="{ 'overlay-victory': isGameOver }"
        >
          <div v-if="isGameOver" class="victory-fx-layer" aria-hidden="true">
            <span
              v-for="p in victoryParticles"
              :key="p.id"
              class="victory-confetti"
              :style="{
                left: `${p.left}%`,
                backgroundColor: p.color,
                width: `${p.size}px`,
                height: `${p.size * 1.4}px`,
                animationDelay: `${p.delay}s`,
                animationDuration: `${p.duration}s`,
                '--drift': `${p.drift}px`,
              }"
            />
          </div>

          <div
            class="text-h6 text-weight-bold text-amber-4 q-mb-xs relative-position"
            :class="{ 'victory-title': isGameOver }"
          >
            {{ isGameOver ? '🏆 FIM DE PARTIDA 🏆' : 'TÊNIS DE MESA' }}
          </div>
          <p class="text-caption text-grey-3 q-mb-md relative-position">{{ statusMessage }}</p>
          <q-btn
            color="light-blue-6"
            text-color="white"
            unelevated
            class="relative-position"
            :label="isGameOver ? 'Jogar de Novo' : 'Iniciar Partida'"
            @click="handleStartOrRestart"
          />
        </div>
      </div>

      <div class="touch-controls row items-center justify-between full-width q-px-xs q-gutter-xs">
        <div class="row q-gutter-xs">
          <q-btn
            dense
            outline
            color="light-blue-4"
            icon="arrow_back"
            class="touch-pad-btn"
            @pointerdown="touchPlayerLeft = true"
            @pointerup="touchPlayerLeft = false"
            @pointerleave="touchPlayerLeft = false"
          />
          <q-btn
            dense
            outline
            color="light-blue-4"
            icon="arrow_forward"
            class="touch-pad-btn"
            @pointerdown="touchPlayerRight = true"
            @pointerup="touchPlayerRight = false"
            @pointerleave="touchPlayerRight = false"
          />
        </div>

        <div class="row items-center justify-center q-gutter-xs action-group">
          <q-btn
            color="positive"
            text-color="white"
            label="Iniciar Jogo"
            dense
            unelevated
            class="action-btn q-px-sm"
            :disable="isGameStarted && !isGameOver"
            @click="handleStartOrRestart"
          />
          <q-btn
            color="green-8"
            text-color="white"
            label="Reiniciar"
            dense
            unelevated
            class="action-btn q-px-sm"
            @click="handleRestart"
          />
          <q-btn
            style="margin-left: 5px"
            color="deep-orange-9"
            text-color="white"
            label="Sair"
            dense
            unelevated
            class="action-btn q-px-sm"
            @click="exitGame"
          />
        </div>

        <div v-if="gameMode === 'pvp'" class="row q-gutter-xs">
          <q-btn
            dense
            outline
            color="rose-4"
            icon="chevron_left"
            class="touch-pad-btn"
            @pointerdown="touchP2Left = true"
            @pointerup="touchP2Left = false"
            @pointerleave="touchP2Left = false"
          />
          <q-btn
            dense
            outline
            color="rose-4"
            icon="chevron_right"
            class="touch-pad-btn"
            @pointerdown="touchP2Right = true"
            @pointerup="touchP2Right = false"
            @pointerleave="touchP2Right = false"
          />
        </div>
      </div>

      <div
        v-if="isPvPMode"
        class="row q-mb-sm q-gutter-xs justify-center items-center p2-controls-box full-width"
      >
        <span class="text-caption text-grey-4 q-mr-xs">Jogador 2 (A / D):</span>
        <q-btn
          dense
          outline
          size="sm"
          color="rose-4"
          icon="chevron_left"
          class="touch-pad-btn"
          @pointerdown="touchP2Left = true"
          @pointerup="touchP2Left = false"
          @pointerleave="touchP2Left = false"
          @pointercancel="touchP2Left = false"
        />
        <q-btn
          dense
          outline
          size="sm"
          color="rose-4"
          icon="chevron_right"
          class="touch-pad-btn"
          @pointerdown="touchP2Right = true"
          @pointerup="touchP2Right = false"
          @pointerleave="touchP2Right = false"
          @pointercancel="touchP2Right = false"
        />
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../game/pingPongConstants';
import { PingPongEngine, type Competitor } from '../game/PingPongEngine';
import { soundManager } from '../game/classes/SoundManager';
import { useInputControls } from '../composables/useInputControls';
import { useRouter } from 'vue-router';
const router = useRouter();

interface VictoryParticle {
  id: number;
  left: number;
  color: string;
  size: number;
  delay: number;
  duration: number;
  drift: number;
}

const VICTORY_COLORS = ['#facc15', '#38bdf8', '#4ade80', '#f472b6', '#c084fc', '#fb923c'];

const createVictoryParticles = (): VictoryParticle[] =>
  Array.from({ length: 28 }, (_, idx) => ({
    id: idx,
    left: ((idx * 17 + 7) % 94) + 3,
    color: VICTORY_COLORS[idx % VICTORY_COLORS.length] ?? '#facc15',
    size: 5 + (idx % 4) * 2,
    delay: (idx % 7) * 0.14,
    duration: 1.8 + (idx % 5) * 0.35,
    drift: (idx % 2 === 0 ? 1 : -1) * (14 + (idx % 4) * 8),
  }));

const canvasRef = ref<HTMLCanvasElement | null>(null);
const engine = new PingPongEngine();

const { getMovements, touchPlayerLeft, touchPlayerRight, touchP2Left, touchP2Right } =
  useInputControls();

const playerScore = ref(0);
const aiScore = ref(0);
const playerSets = ref(0);
const aiSets = ref(0);
const isDeuce = ref(false);
const isGameStarted = ref(false);
const isGameOver = ref(false);
const currentServer = ref<Competitor>('player');
const statusMessage = ref(engine.message);
const gameMode = ref<'pve' | 'pvp'>('pve');
const difficulty = ref<'easy' | 'hard'>('hard');
const victoryParticles = ref<VictoryParticle[]>([]);
const hasPlayedVictoryFx = ref(false);

const isPvPMode = computed({
  get: () => gameMode.value === 'pvp',
  set: (val: boolean) => {
    gameMode.value = val ? 'pvp' : 'pve';
  },
});

const isHardMode = computed({
  get: () => difficulty.value === 'hard',
  set: (val: boolean) => {
    difficulty.value = val ? 'hard' : 'easy';
  },
});

let animationFrameId: number | null = null;

const triggerVictoryEffects = (): void => {
  victoryParticles.value = createVictoryParticles();
  try {
    soundManager.playWin();
  } catch (error) {
    console.warn('Erro ao reproduzir som de vitória:', error);
  }
};

const clearVictoryEffects = (): void => {
  victoryParticles.value = [];
  hasPlayedVictoryFx.value = false;
};

const syncHudState = (): void => {
  playerScore.value = engine.player.score;
  aiScore.value = engine.ai.score;
  playerSets.value = engine.player.sets;
  aiSets.value = engine.ai.sets;
  isDeuce.value = engine.isDeuce;
  isGameStarted.value = engine.isGameStarted;
  isGameOver.value = engine.isGameOver;
  currentServer.value = engine.currentServer;
  statusMessage.value = engine.message;

  if (engine.isGameOver && !hasPlayedVictoryFx.value) {
    hasPlayedVictoryFx.value = true;
    triggerVictoryEffects();
  } else if (!engine.isGameOver && hasPlayedVictoryFx.value) {
    clearVictoryEffects();
  }
};

const handleStartOrRestart = (): void => {
  if (engine.isGameOver) {
    clearVictoryEffects();
    engine.restartMatch();
  }
  engine.isGameStarted = true;
  engine.message = 'Partida em andamento! Lembre-se: a bola deve quicar antes de bater.';
  syncHudState();
};

const handleRestart = (): void => {
  clearVictoryEffects();
  engine.restartMatch();
  engine.isGameStarted = true;
  syncHudState();
};

const handleExitGame = (): void => {
  clearVictoryEffects();
  engine.isGameStarted = false;
  engine.isGameOver = false;
  engine.restartMatch();
  engine.isGameStarted = false;
  engine.message = 'Partida encerrada. Clique em Iniciar Jogo para jogar de novo.';
  syncHudState();
};

const selectMode = (mode: 'pve' | 'pvp'): void => {
  clearVictoryEffects();
  gameMode.value = mode;
  engine.setGameMode(mode);
  engine.isGameStarted = true;
  syncHudState();
};

const updateGameMode = (val: boolean): void => {
  selectMode(val ? 'pvp' : 'pve');
};

const toggleDifficulty = (): void => {
  difficulty.value = difficulty.value === 'hard' ? 'easy' : 'hard';
  engine.setDifficulty(difficulty.value);
  syncHudState();
};

const updateDifficulty = (val: boolean): void => {
  difficulty.value = val ? 'hard' : 'easy';
  engine.setDifficulty(difficulty.value);
  syncHudState();
};

const gameLoop = (): void => {
  const { playerDx, p2Dx } = getMovements();
  engine.update(playerDx, p2Dx);

  const canvas = canvasRef.value;
  if (canvas) {
    const ctx = canvas.getContext('2d');
    if (ctx) {
      engine.render(ctx);
    }
  }

  syncHudState();
  animationFrameId = requestAnimationFrame(gameLoop);
};

const exitGame = () => {
  window.close();
  setTimeout(() => {
    router.push('/');
  }, 100);
};

onMounted(() => {
  const canvas = canvasRef.value;
  if (canvas) {
    const ctx = canvas.getContext('2d');
    if (ctx) {
      engine.render(ctx);
    }
  }
  syncHudState();
  animationFrameId = requestAnimationFrame(gameLoop);
});

onUnmounted(() => {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
  }
});
</script>

<style scoped>
.page-responsive {
  min-height: 100dvh;
}

.game-wrapper {
  width: 100%;
  max-width: 420px;
}

.scoreboard {
  background: rgba(30, 41, 59, 0.9);
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 10px;
}

.score-side {
  min-width: 0;
}

.score-center {
  text-align: center;
}

.difficulty-row {
  margin-top: -25px;
}

.difficulty-row :deep(.q-toggle) {
  margin-bottom: -10px;
}

.status-banner {
  background: rgba(15, 23, 42, 0.85);
  border: 1px solid rgba(250, 204, 21, 0.25);
  border-radius: 8px;
  min-height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.canvas-container {
  border: 2px solid #334155;
  border-radius: 10px;
  overflow: hidden;
  line-height: 0;
  max-width: 100%;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.45);
}

.game-canvas {
  display: block;
  max-width: 100%;
  height: auto;
}

.overlay {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.82);
  backdrop-filter: blur(2px);
  overflow: hidden;
}

.overlay-victory {
  background: radial-gradient(circle at center, rgba(250, 204, 21, 0.16), rgba(15, 23, 42, 0.88));
  box-shadow: inset 0 0 28px rgba(250, 204, 21, 0.35);
}

.victory-fx-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.victory-confetti {
  position: absolute;
  top: -16px;
  border-radius: 2px;
  opacity: 0.95;
  animation-name: confetti-fall;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
}

.victory-title {
  animation: victory-pop 0.9s ease-in-out infinite alternate;
  text-shadow: 0 0 14px rgba(250, 204, 21, 0.65);
}

@keyframes confetti-fall {
  0% {
    transform: translate3d(0, -10px, 0) rotate(0deg);
    opacity: 1;
  }
  100% {
    transform: translate3d(var(--drift, 16px), 460px, 0) rotate(540deg);
    opacity: 0.2;
  }
}

@keyframes victory-pop {
  0% {
    transform: scale(1);
  }
  100% {
    transform: scale(1.07);
  }
}

.control-row {
  padding: 2px 6px;
}

.touch-controls {
  flex-wrap: wrap;
  row-gap: 8px;
}

.touch-pad-btn {
  touch-action: none;
  user-select: none;
  min-width: 38px;
  min-height: 36px;
}

.action-group {
  flex-wrap: wrap;
}

.p2-controls-box {
  background: rgba(255, 255, 255, 0.05);
  padding: 6px;
  border-radius: 8px;
}

.controls-bar {
  background: rgba(30, 41, 59, 0.75);
  border: 1px solid rgba(148, 163, 184, 0.15);
  border-radius: 10px;
  padding: 6px;
}

.action-btn {
  font-size: 11px;
  padding: 6px 10px;
  border-radius: 6px;
  font-weight: bold;
  white-space: nowrap;
}

/* Tablet (600px a 1023px) */
@media (min-width: 600px) and (max-width: 1023px) {
  .game-wrapper {
    max-width: 500px;
  }

  .touch-pad-btn {
    min-width: 46px;
    min-height: 42px;
  }

  .action-btn {
    font-size: 12px;
    padding: 7px 12px;
  }
}

/* Phone (até 599px) */
@media (max-width: 599px) {
  .game-wrapper {
    max-width: 100%;
  }

  .score-label {
    font-size: 10px;
  }

  .score-value {
    font-size: 1.25rem;
  }

  .difficulty-row {
    margin-top: -12px;
  }

  .difficulty-row :deep(.q-toggle) {
    margin-bottom: 0;
  }

  .touch-controls {
    justify-content: center;
  }

  .touch-pad-btn {
    min-width: 44px;
    min-height: 40px;
  }

  .action-btn {
    font-size: 10px;
    padding: 5px 8px;
  }
}
</style>
