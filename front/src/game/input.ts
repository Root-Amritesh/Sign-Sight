export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  fire: boolean;
  pausePressed: boolean;
  exitPressed: boolean;
  touchX: number | null;
  touchY: number | null;
}

export class InputController {
  public state: InputState = {
    up: false,
    down: false,
    left: false,
    right: false,
    fire: false,
    pausePressed: false,
    exitPressed: false,
    touchX: null,
    touchY: null,
  };

  private canvasElement: HTMLCanvasElement;
  private boundKeyDown: (e: KeyboardEvent) => void;
  private boundKeyUp: (e: KeyboardEvent) => void;
  private boundTouchMove: (e: TouchEvent) => void;
  private boundTouchEnd: (e: TouchEvent) => void;

  constructor(canvasElement: HTMLCanvasElement) {
    this.canvasElement = canvasElement;
    this.boundKeyDown = this.handleKeyDown.bind(this);
    this.boundKeyUp = this.handleKeyUp.bind(this);
    this.boundTouchMove = this.handleTouchMove.bind(this);
    this.boundTouchEnd = this.handleTouchEnd.bind(this);

    window.addEventListener('keydown', this.boundKeyDown);
    window.addEventListener('keyup', this.boundKeyUp);
    canvasElement.addEventListener('touchmove', this.boundTouchMove, { passive: false });
    canvasElement.addEventListener('touchstart', this.boundTouchMove, { passive: false });
    canvasElement.addEventListener('touchend', this.boundTouchEnd);
  }

  private handleKeyDown(e: KeyboardEvent) {
    if (['ArrowUp', 'KeyW'].includes(e.code)) this.state.up = true;
    if (['ArrowDown', 'KeyS'].includes(e.code)) this.state.down = true;
    if (['ArrowLeft', 'KeyA'].includes(e.code)) this.state.left = true;
    if (['ArrowRight', 'KeyD'].includes(e.code)) this.state.right = true;
    if (['Space'].includes(e.code)) this.state.fire = true;
    if (['KeyP'].includes(e.code)) this.state.pausePressed = true;
    if (['Escape'].includes(e.code)) this.state.exitPressed = true;
  }

  private handleKeyUp(e: KeyboardEvent) {
    if (['ArrowUp', 'KeyW'].includes(e.code)) this.state.up = false;
    if (['ArrowDown', 'KeyS'].includes(e.code)) this.state.down = false;
    if (['ArrowLeft', 'KeyA'].includes(e.code)) this.state.left = false;
    if (['ArrowRight', 'KeyD'].includes(e.code)) this.state.right = false;
    if (['Space'].includes(e.code)) this.state.fire = false;
  }

  private handleTouchMove(e: TouchEvent) {
    e.preventDefault();
    if (e.touches.length === 2) {
      this.state.pausePressed = true;
      return;
    }
    const touch = e.touches[0];
    const rect = this.canvasElement.getBoundingClientRect();
    this.state.touchX = touch.clientX - rect.left;
    this.state.touchY = touch.clientY - rect.top;
    this.state.fire = true; // Auto-fire on mobile per game.md
  }

  private handleTouchEnd() {
    this.state.touchX = null;
    this.state.touchY = null;
    this.state.fire = false;
  }

  public resetTriggers() {
    this.state.pausePressed = false;
    this.state.exitPressed = false;
  }

  public destroy() {
    window.removeEventListener('keydown', this.boundKeyDown);
    window.removeEventListener('keyup', this.boundKeyUp);
    this.canvasElement.removeEventListener('touchmove', this.boundTouchMove);
    this.canvasElement.removeEventListener('touchstart', this.boundTouchMove);
    this.canvasElement.removeEventListener('touchend', this.boundTouchEnd);
  }
}
