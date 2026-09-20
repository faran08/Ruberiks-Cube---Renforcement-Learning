import { CommandInterface } from './CommandInterface';
import { SceneSetup } from '../scene/SceneSetup';
import { SingleMoveNotation } from '../types';

export class KeyboardControls {
  private commandInterface: CommandInterface;
  private sceneSetup: SceneSetup;
  private enabled = true;

  constructor(commandInterface: CommandInterface, sceneSetup: SceneSetup) {
    this.commandInterface = commandInterface;
    this.sceneSetup = sceneSetup;
    this.bindEvents();
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  private bindEvents(): void {
    window.addEventListener('keydown', (event) => {
      if (!this.enabled) return;

      // Ignore keyboard shortcuts when typing in inputs or textareas
      const target = event.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      const key = event.key.toUpperCase();
      const isShift = event.shiftKey;

      if (['U', 'D', 'L', 'R', 'F', 'B'].includes(key)) {
        event.preventDefault();
        const move = (isShift ? `${key}'` : key) as SingleMoveNotation;
        this.commandInterface.executeMove(move);
        return;
      }

      if (event.code === 'Space') {
        event.preventDefault();
        this.commandInterface.scramble(20);
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        this.sceneSetup.resetCamera();
        return;
      }
    });
  }
}
