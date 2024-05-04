import { StateNode } from '@tldraw/tldraw'

// There's a guide at the bottom of this file!

export class ScreenshotIdle extends StateNode {
	static id = 'idle'

	// [1]
	onPointerDown = () => {
		this.parent.transition('pointing')
	}
}

/*
[1]
When we the user makes a pointer down event, we transition to the pointing state.
*/