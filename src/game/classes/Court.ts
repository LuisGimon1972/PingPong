import { COURT } from '../pingPongConstants';

export class Court {
  public static render(
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number,
  ): void {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.fillRect(COURT.x + 4, COURT.y + 6, COURT.width, COURT.height);

    ctx.fillStyle = '#1d4ed8';
    ctx.fillRect(COURT.x, COURT.y, COURT.width, COURT.height);

    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(COURT.x, COURT.y, COURT.width, COURT.height);

    const centerX = COURT.x + COURT.width / 2;
    ctx.beginPath();
    ctx.moveTo(centerX, COURT.y);
    ctx.lineTo(centerX, COURT.y + COURT.height);
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const netY = COURT.y + COURT.height / 2;
    const netOverflow = 12;

    ctx.save();
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(COURT.x - netOverflow, netY);
    ctx.lineTo(COURT.x + COURT.width + netOverflow, netY);
    ctx.stroke();

    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(COURT.x - netOverflow - 3, netY - 4, 4, 8);
    ctx.fillRect(COURT.x + COURT.width + netOverflow - 1, netY - 4, 4, 8);
    ctx.restore();
  }
}
