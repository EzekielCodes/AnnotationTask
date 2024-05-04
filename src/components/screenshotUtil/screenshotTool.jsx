import { StateNode } from '@tldraw/tldraw'
import { ScreenshotDragging } from './childStates/Dragging';
import { ScreenshotIdle } from './childStates/Idle';
import { ScreenshotPointing } from './childStates/Pointing';

// There's a guide at the bottom of this file!

export class ScreenshotTool extends StateNode {
	// [1]
	static id = 'screenshot'
	static initial = 'idle'
	static children = () => [ScreenshotIdle, ScreenshotPointing, ScreenshotDragging]

	// [2]
    onEnter = () => {
		this.editor.setCursor({ type: 'cross', rotation: 0 })
	}

    onExit = () => {
		this.editor.setCursor({ type: 'default', rotation: 0 });
	}

	// [3]
    onInterrupt = () => {
		this.complete()
	}

    onCancel = () => {
		this.complete();
	}

	complete() {
		this.parent.transition('select', {})
	}
}