import { CANVAS_WIDTH, PADDLE } from '../pingPongConstants';

export class Paddle {
  public x: number;
  public y: number;
  public width: number = PADDLE.width;
  public height: number = PADDLE.height;

  public score = 0;
  public sets = 0;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  public move(dx: number): void {
    this.x += dx;

    // Mantém a raquete dentro dos limites horizontais do canvas
    const minX = 8;
    const maxX = CANVAS_WIDTH - this.width - 8;

    if (this.x < minX) {
      this.x = minX;
    } else if (this.x > maxX) {
      this.x = maxX;
    }
  }

  public resetPosition(x: number, y: number): void {
    this.x = x;
    this.y = y;
  }
}
