<template>
  <q-page class="flex flex-center bg-dark text-white q-pa-sm">
    <div class="game-wrapper column items-center q-gutter-sm">
      <!-- Cabeçalho com Placar e Sets -->
      <div class="scoreboard row items-center justify-between full-width q-pa-sm">
        <div class="column items-start">
          <div class="text-caption text-grey-4">
            {{ gameMode === 'pvp' ? 'JOGADOR 2 (A / D)' : 'OPONENTE (IA)' }}
            <q-badge v-if="currentServer === 'ai'" color="rose-6" label="SAQUE" class="q-ml-xs" />
          </div>
          <div class="row items-baseline q-gutter-xs">
            <span class="text-h5 text-weight-bold text-rose-4">{{ aiScore }}</span>
            <span class="text-caption text-grey-4">Sets: {{ aiSets }}</span>
          </div>
        </div>

        <div class="column items-center">
          <q-badge v-if="isDeuce" color="amber-7" text-color="dark" label="DEUCE" class="q-mb-xs" />
          <div class="text-subtitle2 text-weight-bold text-amber-4">TÊNIS DE MESA</div>
          <div class="text-caption text-grey-4">Melhor de 5 sets</div>
        </div>

        <div class="column items-end">
          <div class="text-caption text-grey-4">
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
            <span class="text-h5 text-weight-bold text-light-blue-4">{{ playerScore }}</span>
          </div>
        </div>
      </div>

      <div class="status-banner full-width text-center q-pa-xs">
        <span class="text-caption text-weight-medium text-amber-2">{{ statusMessage }}</span>
      </div>

      <!-- Área do Canvas -->
      <div class="canvas-container relative-position">
        <canvas ref="canvasRef" :width="CANVAS_WIDTH" :height="CANVAS_HEIGHT" class="game-canvas" />

        <!-- Overlay de Início / Fim de Jogo -->
        <div
          v-if="!isGameStarted || isGameOver"
          class="overlay column items-center justify-center q-pa-md text-center"
        >
          <div class="text-h6 text-weight-bold text-amber-4 q-mb-xs">
            {{ isGameOver ? 'FIM DE PARTIDA' : 'TÊNIS DE MESA' }}
          </div>
          <p class="text-caption text-grey-3 q-mb-md">{{ statusMessage }}</p>
          <q-btn
            color="light-blue-6"
            text-color="white"
            unelevated
            :label="isGameOver ? 'Jogar Novamente' : 'Iniciar Partida'"
            @click="handleStartOrRestart"
          />
        </div>
      </div>

      <!-- Controles Touch (Úteis em telas sensíveis ao toque) -->
      <div class="touch-controls row justify-between full-width q-px-xs">
        <div class="row q-gutter-xs">
          <q-btn
            dense
            outline
            color="light-blue-4"
            icon="chevron_left"
            @pointerdown="touchPlayerLeft = true"
            @pointerup="touchPlayerLeft = false"
            @pointerleave="touchPlayerLeft = false"
          />
          <q-btn
            dense
            outline
            color="light-blue-4"
            icon="chevron_right"
            @pointerdown="touchPlayerRight = true"
            @pointerup="touchPlayerRight = false"
            @pointerleave="touchPlayerRight = false"
          />
        </div>

        <div v-if="gameMode === 'pvp'" class="row q-gutter-xs">
          <q-btn
            dense
            outline
            color="rose-4"
            icon="chevron_left"
            @pointerdown="touchP2Left = true"
            @pointerup="touchP2Left = false"
            @pointerleave="touchP2Left = false"
          />
          <q-btn
            dense
            outline
            color="rose-4"
            icon="chevron_right"
            @pointerdown="touchP2Right = true"
            @pointerup="touchP2Right = false"
            @pointerleave="touchP2Right = false"
          />
        </div>
      </div>

      <!-- Barra de Ações e Modos -->
      <div class="controls-bar row items-center justify-center q-gutter-xs full-width">
        <q-btn
          dense
          unelevated
          size="sm"
          :color="gameMode === 'pve' ? 'primary' : 'grey-8'"
          label="vs IA"
          @click="selectMode('pve')"
        />
        <q-btn
          dense
          unelevated
          size="sm"
          :color="gameMode === 'pvp' ? 'primary' : 'grey-8'"
          label="2 Jogadores"
          @click="selectMode('pvp')"
        />
        <q-btn
          v-if="gameMode === 'pve'"
          dense
          outline
          size="sm"
          color="amber-4"
          :label="difficulty === 'hard' ? 'Difícil' : 'Fácil'"
          @click="toggleDifficulty"
        />
        <q-btn dense outline size="sm" color="grey-4" icon="refresh" @click="handleRestart" />
        <q-btn
          dense
          flat
          round
          size="sm"
          :color="isMuted ? 'grey-5' : 'amber-4'"
          :icon="isMuted ? 'volume_off' : 'volume_up'"
          @click="handleToggleMute"
        />
      </div>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../game/pingPongConstants';
import { PingPongEngine, type Competitor } from '../game/PingPongEngine';
import { soundManager } from '../game/classes/SoundManager';
import { useInputControls } from '../composables/useInputControls';

const canvasRef = ref<HTMLCanvasElement | null>(null);
const engine = new PingPongEngine();

const { getMovements, touchPlayerLeft, touchPlayerRight, touchP2Left, touchP2Right } =
  useInputControls();

// Estado reativo sincronizado para o HUD
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
const isMuted = ref(soundManager.isMuted);

let animationFrameId: number | null = null;

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
};

const handleStartOrRestart = (): void => {
  if (engine.isGameOver) {
    engine.restartMatch();
  }
  engine.isGameStarted = true;
  engine.message = 'Partida em andamento! Lembre-se: a bola deve quicar antes de bater.';
  syncHudState();
};

const handleRestart = (): void => {
  engine.restartMatch();
  engine.isGameStarted = true;
  syncHudState();
};

const selectMode = (mode: 'pve' | 'pvp'): void => {
  gameMode.value = mode;
  engine.setGameMode(mode);
  engine.isGameStarted = true;
  syncHudState();
};

const toggleDifficulty = (): void => {
  difficulty.value = difficulty.value === 'hard' ? 'easy' : 'hard';
  engine.setDifficulty(difficulty.value);
  syncHudState();
};

const handleToggleMute = (): void => {
  isMuted.value = soundManager.toggleMute();
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
.game-wrapper {
  width: 100%;
  max-width: 420px;
}

.scoreboard {
  background: rgba(30, 41, 59, 0.9);
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 10px;
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
}

.controls-bar {
  background: rgba(30, 41, 59, 0.75);
  border: 1px solid rgba(148, 163, 184, 0.15);
  border-radius: 10px;
  padding: 6px;
}
</style>
