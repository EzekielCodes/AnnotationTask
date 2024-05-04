import { StateNode } from '@tldraw/editor'
import { Idle } from './toolStates/Idle'
import { Pointing } from './toolStates/Pointing'

/** @public */
export class LabelShapeTool extends StateNode {
	static id = 'label'
	static initial = 'idle'
	static children = () => [Idle, Pointing]
	shapeType = 'label'
}
