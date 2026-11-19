export type PaddleFacing = 'vertical' | 'left' | 'right';
export type PaddleOwner = 'ai' | 'hum';

export class PingPongAtlas {
  public readonly cols = 6;
  public readonly rows = 6;
  public readonly atlasSize = 512;
  public readonly cellWidth = this.atlasSize / this.cols;
  public readonly cellHeight = this.atlasSize / this.rows;

  public image: HTMLImageElement;
  public isLoaded = false;

  constructor(src: string) {
    this.image = new Image();
    this.image.onload = () => {
      this.isLoaded = true;
    };
    this.image.onerror = () => {
      this.isLoaded = false;
      console.warn(`[PingPongAtlas] Não foi possível carregar o atlas em: ${src}`);
    };
    this.image.src = src;
  }

  public getRow(owner: PaddleOwner, facing: PaddleFacing): number {
    const baseRow = owner === 'ai' ? 0 : 3;
    if (facing === 'left') return baseRow + 1;
    if (facing === 'right') return baseRow + 2;
    return baseRow;
  }

  public drawPaddle(
    ctx: CanvasRenderingContext2D,
    owner: PaddleOwner,
    facing: PaddleFacing,
    col: number,
    dx: number,
    dy: number,
    dw: number,
    dh: number,
  ): void {
    const safeCol = ((col % this.cols) + this.cols) % this.cols;
    const row = this.getRow(owner, facing);

    if (!this.isLoaded || !this.image.complete || this.image.naturalWidth === 0) {
      ctx.fillStyle = owner === 'ai' ? '#f43f5e' : '#38bdf8';
      ctx.fillRect(dx, dy, dw, dh);
      return;
    }

    const sx = safeCol * this.cellWidth;
    const sy = row * this.cellHeight;

    ctx.drawImage(this.image, sx, sy, this.cellWidth, this.cellHeight, dx, dy, dw, dh);
  }
}
