export const CANVAS_WIDTH = 380;
export const CANVAS_HEIGHT = 484; // Reduz a margem escura abaixo da raquete inferior até a borda do canvas

export const COURT = {
  x: 70,
  y: 62, // Aproxima a raquete superior da borda superior do canvas
  width: 240,
  height: 360,
};

export const PADDLE = {
  width: 56,
  height: 10,
  speed: 4.8,
  playerOffsetY: 32, // Abaixo da linha de fundo inferior da mesa
  aiOffsetY: 38, // Acima da linha de fundo superior da mesa
};

export const BALL = {
  radius: 5,
  baseSpeedX: 1.8,
  baseSpeedY: 3.2,
  maxSpeed: 6.5,
  historyLength: 8,
};
