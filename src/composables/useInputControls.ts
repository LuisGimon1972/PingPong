import { onMounted, onUnmounted, ref } from 'vue';
import { PADDLE } from '../game/pingPongConstants';

export function useInputControls() {
  const keysPressed = new Set<string>();

  const touchPlayerLeft = ref(false);
  const touchPlayerRight = ref(false);
  const touchP2Left = ref(false);
  const touchP2Right = ref(false);

  const handleKeyDown = (event: KeyboardEvent): void => {
    const key = event.key.toLowerCase();
    if (['arrowleft', 'arrowright', 'a', 'd'].includes(key)) {
      event.preventDefault();
    }
    keysPressed.add(key);
  };

  const handleKeyUp = (event: KeyboardEvent): void => {
    keysPressed.delete(event.key.toLowerCase());
  };

  const handleWindowBlur = (): void => {
    keysPressed.clear();
    touchPlayerLeft.value = false;
    touchPlayerRight.value = false;
    touchP2Left.value = false;
    touchP2Right.value = false;
  };

  onMounted(() => {
    window.addEventListener('keydown', handleKeyDown, { passive: false });
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleWindowBlur);
  });

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('keyup', handleKeyUp);
    window.removeEventListener('blur', handleWindowBlur);
  });

  const getMovements = (): { playerDx: number; p2Dx: number } => {
    let playerDx = 0;
    if (keysPressed.has('arrowleft') || touchPlayerLeft.value) {
      playerDx -= PADDLE.speed;
    }
    if (keysPressed.has('arrowright') || touchPlayerRight.value) {
      playerDx += PADDLE.speed;
    }

    let p2Dx = 0;
    if (keysPressed.has('a') || touchP2Left.value) {
      p2Dx -= PADDLE.speed;
    }
    if (keysPressed.has('d') || touchP2Right.value) {
      p2Dx += PADDLE.speed;
    }

    return { playerDx, p2Dx };
  };

  return {
    getMovements,
    touchPlayerLeft,
    touchPlayerRight,
    touchP2Left,
    touchP2Right,
  };
}
