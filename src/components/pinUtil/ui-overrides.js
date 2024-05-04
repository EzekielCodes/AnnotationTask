import { menuItem, toolbarItem } from '@tldraw/tldraw'

// In order to see select our custom shape tool, we need to add it to the ui.



export const uiOverrides = {
	tools(editor, tools) {
		// Create a tool item in the ui's context.
		tools.pin = {
			id: 'pin',
			icon: 'avatar',
			label: 'pin',
			kbd: 'c',
			readonlyOk: false,
			onSelect: () => {
				editor.setCurrentTool('pin')
			},
		};
		tools.screenshot = {
			id: 'screenshot',
			label: 'Screenshot',
			readonlyOk: false,
			icon: 'tool-screenshot',
			kbd: 'j',
			onSelect() {
				editor.setCurrentTool('screenshot')
			},
		};
		tools.label = {
			id: 'label',
			label: 'Label',
			readonlyOk: false,
			icon: 'note',
			kbd: 'c',
			onSelect() {
				editor.setCurrentTool('label')
			},
		};
		return tools
	},
	toolbar(_app, toolbar, { tools }) {
		// Add the tool item from the context to the toolbar.
		toolbar.splice(6, 0, toolbarItem(tools.pin));
		toolbar.splice(9, 0, toolbarItem(tools.screenshot));
		toolbar.splice(7, 0, toolbarItem(tools.label))
		return toolbar
	},
	keyboardShortcutsMenu(_app, keyboardShortcutsMenu, { tools }) {
		// Add the tool item from the context to the keyboard shortcuts dialog.
		const toolsGroup = keyboardShortcutsMenu.find(
			(group) => group.id === 'shortcuts-dialog.tools'
		)
		toolsGroup.children.push(menuItem(tools.pin))
		return keyboardShortcutsMenu
	},
}