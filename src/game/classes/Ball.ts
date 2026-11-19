import { CANVAS_WIDTH, COURT, BALL } from '../pingPongConstants';

export interface BallTrailPoint {
  x: number;
  y: number;
}

export class Ball {
  public x: number;
  public y: number;
  public vx = 0;
  public vy = 0;
  public radius: number = BALL.radius;

  public history: BallTrailPoint[] = [];
  public hasBouncedInCurrentCourt = false;
  public lastHitByPlayer: boolean | null = null;

  constructor(x: number = CANVAS_WIDTH / 2, y: number = COURT.y + COURT.height / 2) {
    this.x = x;
    this.y = y;
    this.reset(true);
  }

  public reset(servingToPlayer: boolean): void {
    const netY = COURT.y + COURT.height / 2;
    const courtCenterX = COURT.x + COURT.width / 2;

    this.x = courtCenterX;
    this.y = servingToPlayer ? COURT.y + COURT.height - 24 : COURT.y + 24;

    const dirX = Math.random() < 0.5 ? -1 : 1;
    const spreadX = (Math.random() * 0.6 + 0.5) * BALL.baseSpeedX;

    // Se o jogador 1 (embaixo) inicia a jogada, a bola vai em direção à rede/campo superior
    if (servingToPlayer) {
      this.vx = dirX * spreadX;
      this.vy = -BALL.baseSpeedY;
      this.lastHitByPlayer = true;
    } else {
      // Se o oponente (em cima) inicia a jogada, a bola vai em direção à rede/campo inferior
      this.vx = dirX * spreadX;
      this.vy = BALL.baseSpeedY;
      this.lastHitByPlayer = false;
    }

    this.hasBouncedInCurrentCourt = false;
    this.history = [];

    // Garante posição válida dentro do eixo central da mesa
    if (Math.abs(this.y - netY) < this.radius) {
      this.y = servingToPlayer ? netY + 40 : netY - 40;
    }
  }

  public update(): void {
    this.history.push({ x: this.x, y: this.y });
    if (this.history.length > BALL.historyLength) {
      this.history.shift();
    }

    this.x += this.vx;
    this.y += this.vy;

    // Limita velocidade máxima para manter o controle das trajetórias
    const currentSpeed = Math.hypot(this.vx, this.vy);
    if (currentSpeed > BALL.maxSpeed) {
      const ratio = BALL.maxSpeed / currentSpeed;
      this.vx *= ratio;
      this.vy *= ratio;
    }
  }
}
