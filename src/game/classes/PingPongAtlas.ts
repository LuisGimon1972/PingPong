export type PaddleFacing = 'vertical' | 'left' | 'right';
export type PaddleOwner = 'ai' | 'hum';

export class PingPongAtlas {
  public readonly cols = 6;
  public readonly rows = 6;
  public readonly atlasSize = 512;
  public cellWidth = this.atlasSize / this.cols;
  public cellHeight = this.atlasSize / this.rows;

  public image: HTMLImageElement;
  public isLoaded = false;

  private candidateSources: string[] = [];
  private currentSourceIndex = 0;

  constructor(src: string) {
    this.image = new Image();
    this.candidateSources = this.buildCandidates(src);
    this.loadNextSource();
  }

  private expandExtensions(path: string): string[] {
    const match = path.match(/^(.*)\.(png|webp|jpe?g)$/i);
    if (!match) {
      return [path, `${path}.png`, `${path}.webp`, `${path}.jpg`, `${path}.jpeg`];
    }

    const stem = match[1] as string;
    return [`${stem}.png`, `${stem}.webp`, `${stem}.jpg`, `${stem}.jpeg`];
  }

  private buildCandidates(primarySrc: string): string[] {
    const clean = primarySrc.trim();
    const lowerImages = clean.replace(/\/Images\//g, '/images/');
    const baseVariants = [
      clean,
      clean.replace(/^\/+/, ''),
      `./${clean.replace(/^\/+/, '')}`,
      lowerImages,
      lowerImages.replace(/^\/+/, ''),
      `./${lowerImages.replace(/^\/+/, '')}`,
    ];

    const expanded: string[] = [];
    for (const variant of baseVariants) {
      for (const withExt of this.expandExtensions(variant)) {
        expanded.push(withExt);
      }
    }

    return Array.from(new Set(expanded.filter(Boolean)));
  }

  private loadNextSource(): void {
    if (this.currentSourceIndex >= this.candidateSources.length) {
      this.isLoaded = false;
      console.warn(
        '[PingPongAtlas] Não foi possível carregar o atlas em nenhum caminho:',
        this.candidateSources,
      );
      return;
    }

    const nextSrc = this.candidateSources[this.currentSourceIndex] as string;
    this.currentSourceIndex += 1;

    this.image.onload = () => {
      this.isLoaded = true;
      if (this.image.naturalWidth > 0 && this.image.naturalHeight > 0) {
        this.cellWidth = this.image.naturalWidth / this.cols;
        this.cellHeight = this.image.naturalHeight / this.rows;
      }
    };

    this.image.onerror = () => {
      this.isLoaded = false;
      this.loadNextSource();
    };

    this.image.src = nextSrc;
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
