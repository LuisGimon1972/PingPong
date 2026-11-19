import { CANVAS_WIDTH, CANVAS_HEIGHT, COURT, PADDLE } from './pingPongConstants';
import { Ball } from './classes/Ball';
import { Paddle } from './classes/Paddle';
import { Court } from './classes/Court';
import { soundManager } from './classes/SoundManager';
import { PingPongAtlas, type PaddleFacing } from './classes/PingPongAtlas';

export type Competitor = 'player' | 'ai';

export interface BounceMark {
  x: number;
  y: number;
  alpha: number;
  side: Competitor;
}

export class PingPongEngine {
  public player: Paddle;
  public ai: Paddle;
  public ball: Ball;
  public bounceMarks: BounceMark[] = [];

  public isGameOver = false;
  public isGameStarted = false;
  public isDeuce = false;
  public currentServer: Competitor = 'player';
  public message = 'DIRECIONAMENTO ATIVO PARA A ÁREA AZUL! PIQUE ANTES DE BATER';

  private atlas = new PingPongAtlas('/images/AtlasPingPong.png');
  private aiFacing: PaddleFacing = 'vertical';
  private playerFacing: PaddleFacing = 'vertical';
  private animFrameCounter = 0;

  private difficulty: 'easy' | 'hard' = 'hard';
  private gameMode: 'pve' | 'pvp' = 'pve';

  private bouncesOnCurrentSide = 0;
  private lastBounceSide: Competitor | null = null;
  private lastStriker: Competitor | null = 'player';

  private bounceScale = 1;
  private totalPointsPlayed = 0;
  private matchStartServer: Competitor = 'player';
  private lastHitTime = 0;
  private hitCooldownMs = 160;

  // Ponto-alvo dentro da área azul para onde a bola é direcionada
  private targetBounceX = COURT.x + COURT.width / 2;
  private targetBounceY = COURT.y + COURT.height * 0.28;
  private activeTargetSide: Competitor = 'ai';

  private readonly playerPaddleY = COURT.y + COURT.height + 10;
  private readonly aiPaddleY = COURT.y - PADDLE.height - 10;

  constructor() {
    const centerX = COURT.x + COURT.width / 2 - PADDLE.width / 2;
    this.player = new Paddle(centerX, this.playerPaddleY);
    this.ai = new Paddle(centerX, this.aiPaddleY);
    this.ball = new Ball(CANVAS_WIDTH / 2, COURT.y + COURT.height / 2);

    this.resetPoint();
  }

  public setDifficulty(level: 'easy' | 'hard'): void {
    this.difficulty = level;
    this.gameMode = 'pve';
    this.message = level === 'hard' ? 'Modo Difícil Ativado' : 'Modo Fácil Ativado';
  }

  public setGameMode(mode: 'pve' | 'pvp'): void {
    this.gameMode = mode;
    this.message = mode === 'pvp' ? 'Modo 2 Jogadores Ativado' : 'Modo Jogador vs IA Ativado';
    this.restartMatch();
  }

  public restartMatch(): void {
    this.player.score = 0;
    this.ai.score = 0;
    this.player.sets = 0;
    this.ai.sets = 0;
    this.isGameOver = false;
    this.isDeuce = false;
    this.totalPointsPlayed = 0;
    this.matchStartServer = this.matchStartServer === 'player' ? 'ai' : 'player';
    this.currentServer = this.matchStartServer;
    this.bounceMarks = [];
    this.bounceScale = 1;
    this.message = 'NOVA PARTIDA! DIRECIONAMENTO PARA A ÁREA AZUL';
    this.resetPoint();
  }

  private computeNextServer(): Competitor {
    const otherServer: Competitor = this.matchStartServer === 'player' ? 'ai' : 'player';

    if (this.player.score >= 10 && this.ai.score >= 10) {
      return this.totalPointsPlayed % 2 === 0 ? this.matchStartServer : otherServer;
    }

    const blockIndex = Math.floor(this.totalPointsPlayed / 2);
    return blockIndex % 2 === 0 ? this.matchStartServer : otherServer;
  }

  public resetPoint(): void {
    const centerX = COURT.x + COURT.width / 2 - PADDLE.width / 2;
    this.currentServer = this.computeNextServer();
    this.ball.reset(true);
    this.player.resetPosition(centerX, this.playerPaddleY);
    this.ai.resetPosition(centerX, this.aiPaddleY);

    this.bouncesOnCurrentSide = 0;
    this.lastBounceSide = null;
    this.lastStriker = this.currentServer;
    this.bounceScale = 1;
    this.ball.hasBouncedInCurrentCourt = false;
    this.ball.lastHitByPlayer = this.currentServer === 'player';

    if (this.currentServer === 'player') {
      this.ball.x = this.player.x + this.player.width / 2;
      this.ball.y = this.player.y - this.ball.radius - 2;
      this.aimBallTowardTable('ai', 0);
    } else {
      this.ball.x = this.ai.x + this.ai.width / 2;
      this.ball.y = this.ai.y + this.ai.height + this.ball.radius + 2;
      this.aimBallTowardTable('player', 0);
    }
  }

  private aimBallTowardTable(targetSide: Competitor, paddleHitOffset: number): void {
    const marginX = Math.max(14, this.ball.radius + 8);
    const minX = COURT.x + marginX;
    const maxX = COURT.x + COURT.width - marginX;
    const tableCenterX = COURT.x + COURT.width / 2;

    // Combina o offset da raquete com um leve espalhamento para cair sempre dentro da mesa azul
    const clampedOffset = Math.max(-1, Math.min(1, paddleHitOffset));
    const randomJitter = (Math.random() - 0.5) * 0.35;
    const combinedFactor = Math.max(-1, Math.min(1, clampedOffset * 0.75 + randomJitter));

    const desiredX = tableCenterX + combinedFactor * (COURT.width / 2 - marginX);
    const clampedTargetX = Math.max(minX, Math.min(maxX, desiredX));

    const desiredY =
      targetSide === 'ai'
        ? COURT.y + COURT.height * (0.18 + Math.random() * 0.22)
        : COURT.y + COURT.height * (0.6 + Math.random() * 0.22);

    this.activeTargetSide = targetSide;
    this.targetBounceX = clampedTargetX;
    this.targetBounceY = desiredY;

    const dx = this.targetBounceX - this.ball.x;
    const dy = this.targetBounceY - this.ball.y;
    const distance = Math.max(1, Math.hypot(dx, dy));

    const currentSpeed = Math.max(
      4.4,
      Math.min(7.6, Math.hypot(this.ball.vx, this.ball.vy) * 1.03),
    );
    this.ball.vx = (dx / distance) * currentSpeed;
    this.ball.vy = (dy / distance) * currentSpeed;

    // Garante sentido vertical coerente com o lado alvo
    if (targetSide === 'ai' && this.ball.vy >= -2.2) {
      this.ball.vy = -Math.max(2.6, Math.abs(this.ball.vy));
    } else if (targetSide === 'player' && this.ball.vy <= 2.2) {
      this.ball.vy = Math.max(2.6, Math.abs(this.ball.vy));
    }
  }

  private awardPoint(winner: Competitor, reasonMessage?: string): void {
    if (this.isGameOver || !this.isGameStarted) return;

    if (reasonMessage) {
      this.message = reasonMessage;
    }

    if (winner === 'player') this.player.score += 1;
    else this.ai.score += 1;

    try {
      soundManager.playScore();
    } catch (error) {
      console.warn('Erro ao reproduzir som de ponto:', error);
    }

    this.totalPointsPlayed += 1;
    const pScore = this.player.score;
    const aScore = this.ai.score;
    const diff = pScore - aScore;

    this.isDeuce = pScore >= 10 && aScore >= 10 && diff === 0;

    if ((pScore >= 11 || aScore >= 11) && Math.abs(diff) >= 2) {
      const playerWonSet = diff > 0;
      if (playerWonSet) {
        this.player.sets += 1;
        this.message = 'JOGADOR 1 VENCEU O SET! 🏆';
      } else {
        this.ai.sets += 1;
        this.message =
          this.gameMode === 'pvp' ? 'JOGADOR 2 VENCEU O SET! 🏆' : 'OPONENTE VENCEU O SET!';
      }

      if (this.player.sets >= 3 || this.ai.sets >= 3) {
        this.isGameOver = true;
        soundManager.playWin();
        this.message = playerWonSet
          ? 'PARTIDA VENCIDA PELO JOGADOR 1! 🏆'
          : this.gameMode === 'pvp'
            ? 'PARTIDA VENCIDA PELO JOGADOR 2! 🏆'
            : 'PARTIDA VENCIDA PELO OPONENTE!';
        return;
      }

      this.player.score = 0;
      this.ai.score = 0;
      this.totalPointsPlayed = 0;
      this.isDeuce = false;
      this.matchStartServer = this.matchStartServer === 'player' ? 'ai' : 'player';
    }

    this.resetPoint();
  }

  private addBounceMark(x: number, y: number, side: Competitor): void {
    this.bounceMarks.push({ x, y, alpha: 1.0, side });
    if (this.bounceMarks.length > 10) {
      this.bounceMarks.shift();
    }
  }

  private isInsideBlueTable(): boolean {
    return (
      this.ball.x - this.ball.radius >= COURT.x &&
      this.ball.x + this.ball.radius <= COURT.x + COURT.width &&
      this.ball.y - this.ball.radius >= COURT.y &&
      this.ball.y + this.ball.radius <= COURT.y + COURT.height
    );
  }

  public update(playerDx: number, p2Dx: number = 0): void {
    if (this.isGameOver || !this.isGameStarted) return;

    const prevAiX = this.ai.x;
    const prevPlayerX = this.player.x;

    this.player.move(playerDx);

    if (this.gameMode === 'pvp') {
      this.ai.move(p2Dx);
    } else {
      this.updateAI();
    }

    const actualPlayerDx = this.player.x - prevPlayerX;
    const actualAiDx = this.ai.x - prevAiX;

    this.playerFacing =
      actualPlayerDx < -0.25 ? 'left' : actualPlayerDx > 0.25 ? 'right' : 'vertical';
    this.aiFacing = actualAiDx < -0.25 ? 'left' : actualAiDx > 0.25 ? 'right' : 'vertical';
    this.animFrameCounter += 1;

    if (this.bounceScale > 1) {
      this.bounceScale = Math.max(1, this.bounceScale - 0.04);
    }

    for (let i = this.bounceMarks.length - 1; i >= 0; i--) {
      const mark = this.bounceMarks[i];
      if (!mark) continue;
      mark.alpha -= 0.008;
      if (mark.alpha <= 0) {
        this.bounceMarks.splice(i, 1);
      }
    }

    const prevY = this.ball.y;
    this.ball.update();

    const tableTop = COURT.y;
    const tableBottom = COURT.y + COURT.height;

    // 1. PIQUE DENTRO DA ÁREA AZUL (Obrigatório antes da rebatida)
    if (this.isInsideBlueTable() && !this.ball.hasBouncedInCurrentCourt) {
      const reachedUpperBounce =
        this.ball.vy < 0 &&
        prevY >= this.targetBounceY &&
        this.ball.y <= this.targetBounceY &&
        this.lastStriker !== 'ai';

      const reachedLowerBounce =
        this.ball.vy > 0 &&
        prevY <= this.targetBounceY &&
        this.ball.y >= this.targetBounceY &&
        this.lastStriker !== 'player';

      if (reachedUpperBounce) {
        this.registerTableBounce('ai');
      } else if (reachedLowerBounce) {
        this.registerTableBounce('player');
      }
    }

    // 2. SAÍDA PELAS LINHAS DE FUNDO
    if (this.ball.y - this.ball.radius < tableTop - 32) {
      this.awardPoint('player', 'PONTO DO JOGADOR 1!');
      return;
    }

    if (this.ball.y + this.ball.radius > tableBottom + 32) {
      this.awardPoint('ai', 'PONTO DO ADVERSÁRIO!');
      return;
    }

    // 3. REBATIDA COM AS RAQUETES (Somente após pique válido na área azul)
    const now = performance.now();
    if (now - this.lastHitTime > this.hitCooldownMs) {
      // Jogador 1 (parte inferior)
      const hitsPlayerPaddle =
        this.ball.vy > 0 &&
        this.ball.y + this.ball.radius >= this.player.y &&
        this.ball.y - this.ball.radius <= this.player.y + this.player.height &&
        this.ball.x + this.ball.radius >= this.player.x &&
        this.ball.x - this.ball.radius <= this.player.x + this.player.width;

      if (hitsPlayerPaddle) {
        if (this.lastStriker === 'player') {
          this.awardPoint('ai', 'FALTA! Proibido bater duas vezes seguidas.');
          return;
        }

        if (!this.ball.hasBouncedInCurrentCourt || this.lastBounceSide !== 'player') {
          this.awardPoint('ai', 'FALTA! Espere a bola quicar na área azul antes de bater.');
          return;
        }

        const hitOffset =
          (this.ball.x - (this.player.x + this.player.width / 2)) / (this.player.width / 2);

        this.ball.lastHitByPlayer = true;
        this.lastStriker = 'player';
        this.ball.hasBouncedInCurrentCourt = false;
        this.bouncesOnCurrentSide = 0;
        this.lastBounceSide = null;
        this.lastHitTime = now;

        // Direciona ativamente a devolução para a metade superior da mesa azul
        this.aimBallTowardTable('ai', hitOffset);
        this.message = 'Devolução direcionada para a mesa azul (Jogador 1)!';
        soundManager.playHit();
        return;
      }

      // Oponente / Jogador 2 (parte superior)
      const hitsAiPaddle =
        this.ball.vy < 0 &&
        this.ball.y - this.ball.radius <= this.ai.y + this.ai.height &&
        this.ball.y + this.ball.radius >= this.ai.y &&
        this.ball.x + this.ball.radius >= this.ai.x &&
        this.ball.x - this.ball.radius <= this.ai.x + this.ai.width;

      if (hitsAiPaddle) {
        if (this.lastStriker === 'ai') {
          this.awardPoint('player', 'FALTA! Oponente bateu duas vezes seguidas.');
          return;
        }

        if (!this.ball.hasBouncedInCurrentCourt || this.lastBounceSide !== 'ai') {
          this.awardPoint('player', 'FALTA! Espere a bola quicar na área azul antes de bater.');
          return;
        }

        const hitOffset = (this.ball.x - (this.ai.x + this.ai.width / 2)) / (this.ai.width / 2);

        this.ball.lastHitByPlayer = false;
        this.lastStriker = 'ai';
        this.ball.hasBouncedInCurrentCourt = false;
        this.bouncesOnCurrentSide = 0;
        this.lastBounceSide = null;
        this.lastHitTime = now;

        // Direciona ativamente a devolução para a metade inferior da mesa azul
        this.aimBallTowardTable('player', hitOffset);
        this.message = 'Devolução direcionada para a mesa azul (Oponente)!';
        soundManager.playHit();
      }
    }
  }

  private registerTableBounce(bouncedSide: Competitor): void {
    if (this.lastBounceSide === bouncedSide && this.bouncesOnCurrentSide >= 1) {
      const winner: Competitor = bouncedSide === 'player' ? 'ai' : 'player';
      this.awardPoint(winner, 'PONTO! A bola quicou duas vezes no mesmo lado da mesa.');
      return;
    }

    if (this.lastBounceSide === bouncedSide) {
      this.bouncesOnCurrentSide += 1;
    } else {
      this.lastBounceSide = bouncedSide;
      this.bouncesOnCurrentSide = 1;
    }

    this.bounceScale = 1.35;
    this.addBounceMark(this.ball.x, this.ball.y, bouncedSide);
    this.ball.hasBouncedInCurrentCourt = true;
    this.message =
      bouncedSide === 'player'
        ? 'Pique dentro da área azul (baixo)! Pronto para bater.'
        : 'Pique dentro da área azul (cima)! Pronto para bater.';
  }

  private updateAI(): void {
    const ballX = this.ball.x;
    const aiCenter = this.ai.x + this.ai.width / 2;
    const speed = this.difficulty === 'hard' ? 4.4 : 2.9;

    if (ballX < aiCenter - 4) {
      this.ai.move(-speed);
    } else if (ballX > aiCenter + 4) {
      this.ai.move(speed);
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    Court.render(ctx, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Destaque sutil na borda da área azul
    ctx.save();
    ctx.strokeStyle = 'rgba(125, 211, 252, 0.55)';
    ctx.lineWidth = 2;
    ctx.strokeRect(COURT.x + 1, COURT.y + 1, COURT.width - 2, COURT.height - 2);

    // Indicador discreto do ponto-alvo de pique na mesa azul antes da bola quicar
    if (!this.ball.hasBouncedInCurrentCourt && this.isGameStarted && !this.isGameOver) {
      ctx.strokeStyle =
        this.activeTargetSide === 'player'
          ? 'rgba(125, 211, 252, 0.45)'
          : 'rgba(251, 113, 133, 0.45)';
      ctx.setLineDash([3, 3]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(this.targetBounceX, this.targetBounceY, 6, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();

    // Rastro sutil da bola
    this.ball.history.forEach((pt, idx) => {
      const alpha = ((idx + 1) / (this.ball.history.length + 1)) * 0.25;
      ctx.fillStyle = `rgba(250, 204, 21, ${alpha})`;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, this.ball.radius * 0.75, 0, Math.PI * 2);
      ctx.fill();
    });

    // Marcas visuais de pique na área azul
    this.bounceMarks.forEach((mark) => {
      ctx.save();
      ctx.fillStyle = `rgba(255, 255, 255, ${mark.alpha * 0.85})`;
      ctx.strokeStyle =
        mark.side === 'player'
          ? `rgba(56, 189, 248, ${mark.alpha})`
          : `rgba(244, 63, 94, ${mark.alpha})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(mark.x, mark.y, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    });

    const frameCol = Math.floor(this.animFrameCounter / 6) % 6;

    // Raquete Superior (IA / Jogador 2)
    this.atlas.drawPaddle(
      ctx,
      'ai',
      this.aiFacing,
      frameCol,
      this.ai.x - 6,
      this.ai.y - 8,
      this.ai.width + 12,
      this.ai.height + 16,
    );

    // Raquete Inferior (Jogador 1 / HUM)
    this.atlas.drawPaddle(
      ctx,
      'hum',
      this.playerFacing,
      frameCol,
      this.player.x - 6,
      this.player.y - 8,
      this.player.width + 12,
      this.player.height + 16,
    );

    // Bola com escala de quique
    ctx.fillStyle = '#facc15';
    ctx.beginPath();
    ctx.arc(this.ball.x, this.ball.y, this.ball.radius * this.bounceScale, 0, Math.PI * 2);
    ctx.fill();
  }
}
