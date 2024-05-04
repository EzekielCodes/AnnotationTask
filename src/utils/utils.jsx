/* eslint-disable no-inner-declarations */

import {
	getPointerInfo,
	preventDefault,
	stopEventPropagation,
	useEditor,
	useValue,
    DefaultFontStyle,
    DefaultFontFamilies
} from '@tldraw/editor'
import { useCallback, useEffect, useRef } from 'react';


import {
	Box2d
} from '@tldraw/editor'

function correctSpacesToNbsp(input) {
	return input.replace(/\s/g, '\xa0')
}

/** Get an SVG element for a text shape. */
export function createTextSvgElementFromSpans(
	editor,
	spans,
	opts
) {
	const { padding = 0 } = opts

	// Create the text element
	const textElm = document.createElementNS('http://www.w3.org/2000/svg', 'text')
	textElm.setAttribute('font-size', opts.fontSize + 'px')
	textElm.setAttribute('font-family', opts.fontFamily)
	textElm.setAttribute('font-style', opts.fontStyle)
	textElm.setAttribute('font-weight', opts.fontWeight)
	textElm.setAttribute('line-height', opts.lineHeight * opts.fontSize + 'px')
	textElm.setAttribute('dominant-baseline', 'mathematical')
	textElm.setAttribute('alignment-baseline', 'mathematical')

	if (spans.length === 0) return textElm

	const bounds = Box2d.From(spans[0].box)
	for (const { box } of spans) {
		bounds.union(box)
	}

	// const offsetX = padding + (opts.offsetX ?? 0)
	const offsetX = 0;
	// const offsetY = (Math.ceil(opts.height) - bounds.height + opts.fontSize) / 2 + (opts.offsetY ?? 0)
	const offsetY =
		(opts.offsetY ?? 0) +
		opts.fontSize / 2 +
		(opts.verticalTextAlign === 'start'
			? padding
			: opts.verticalTextAlign === 'end'
			? opts.height - padding - bounds.height
			: (Math.ceil(opts.height) - bounds.height) / 2)

	// Create text span elements for each word
	let currentLineTop = null
	for (const { text, box } of spans) {
		// if we broke a line, add a line break span. This helps tools like
		// figma import our exported svg correctly
		const didBreakLine = currentLineTop !== null && box.y > currentLineTop
		if (didBreakLine) {
			const lineBreakTspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan')
			lineBreakTspan.setAttribute('alignment-baseline', 'mathematical')
			lineBreakTspan.setAttribute('x', offsetX + 'px')
			lineBreakTspan.setAttribute('y', box.y + offsetY + 'px')
			lineBreakTspan.textContent = '\n'
			textElm.appendChild(lineBreakTspan)
		}

		const tspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan')
		tspan.setAttribute('alignment-baseline', 'mathematical')
		tspan.setAttribute('x', box.x + offsetX + 'px')
		tspan.setAttribute('y', box.y + offsetY + 'px')
		const cleanText = correctSpacesToNbsp(text)
		tspan.textContent = cleanText
		textElm.appendChild(tspan)

		currentLineTop = box.y
	}

	if (opts.stroke && opts.strokeWidth) {
		textElm.setAttribute('stroke', opts.stroke)
		textElm.setAttribute('stroke-width', opts.strokeWidth + 'px')
	}

	if (opts.fill) {
		textElm.setAttribute('fill', opts.fill)
	}

	return textElm
}


/** @public */
export function getFontDefForExport(fontStyle) {
	return {
		key: `${DefaultFontStyle.id}:${fontStyle}`,
		getElement: async () => {
			const font = findFont(fontStyle)
			if (!font) return null

			const url = (font).$$_url
			const fontFaceRule = (font).$$_fontface
			if (!url || !fontFaceRule) return null

			const fontFile = await (await fetch(url)).blob()
			const base64FontFile = await new Promise((resolve, reject) => {
				const reader = new FileReader()
				reader.onload = () => resolve(reader.result)
				reader.onerror = reject
				reader.readAsDataURL(fontFile)
			})

			const newFontFaceRule = fontFaceRule.replace(url, base64FontFile)
			const style = document.createElementNS('http://www.w3.org/2000/svg', 'style')
			style.textContent = newFontFaceRule
			return style
		},
	}
}

function findFont(name) {
	const fontFamily = DefaultFontFamilies[name]
	for (const font of document.fonts) {
		if (fontFamily.includes(font.family)) {
			return font
		}
	}
	return null
}


export const INDENT = '  '
export class TextHelpers {
	static insertTextFirefox(field, text) {
		// Found on https://www.everythingfrontend.com/blog/insert-text-into-textarea-at-cursor-position.html 🎈
		field.setRangeText(
			text,
			field.selectionStart || 0,
			field.selectionEnd || 0,
			'end' // Without this, the cursor is either at the beginning or text remains selected
		)

		field.dispatchEvent(
			new InputEvent('input', {
				data: text,
				inputType: 'insertText',
				isComposing: false, // TODO: fix @types/jsdom, this shouldn't be required
			})
		)
	}

	/**
	 * Inserts text at the cursor’s position, replacing any selection, with **undo** support and by
	 * firing the input event.
	 */
	static insert(field, text){
		const document = field.ownerDocument
		const initialFocus = document.activeElement
		if (initialFocus !== field) {
			field.focus()
		}

		if (!document.execCommand('insertText', false, text)) {
			TextHelpers.insertTextFirefox(field, text)
		}

		if (initialFocus === document.body) {
			field.blur()
		} else if (initialFocus instanceof HTMLElement && initialFocus !== field) {
			initialFocus.focus()
		}
	}

	/**
	 * Replaces the entire content, equivalent to field.value = text but with **undo** support and by
	 * firing the input event.
	 */
	static set(field, text) {
		field.select()
		TextHelpers.insert(field, text)
	}

	/** Get the selected text in a field or an empty string if nothing is selected. */
	static getSelection(field) {
		const { selectionStart, selectionEnd } = field
		return field.value.slice(
			selectionStart ? selectionStart : undefined,
			selectionEnd ? selectionEnd : undefined
		)
	}

	/**
	 * Adds the wrappingText before and after field’s selection (or cursor). If endWrappingText is
	 * provided, it will be used instead of wrappingText at on the right.
	 */
	static wrapSelection(
		field,
		wrap,
		wrapEnd
	) {
		const { selectionStart, selectionEnd } = field
		const selection = TextHelpers.getSelection(field)
		TextHelpers.insert(field, wrap + selection + (wrapEnd ?? wrap))

		// Restore the selection around the previously-selected text
		field.selectionStart = (selectionStart || 0) + wrap.length
		field.selectionEnd = (selectionEnd || 0) + wrap.length
	}

	/** Finds and replaces strings and regex in the field’s value. */
	static replace(
		field,
		searchValue,
		replacer
	) {
		/** Remembers how much each match offset should be adjusted */
		let drift = 0
		field.value.replace(searchValue, (...args) => {
			// Select current match to replace it later
			const matchStart = drift + (args[args.length - 2])
			const matchLength = args[0].length
			field.selectionStart = matchStart
			field.selectionEnd = matchStart + matchLength
			const replacement = typeof replacer === 'string' ? replacer : replacer(...args)
			TextHelpers.insert(field, replacement)
			// Select replacement. Without this, the cursor would be after the replacement
			field.selectionStart = matchStart
			drift += replacement.length - matchLength
			return replacement
		})
	}

	static findLineEnd(value, currentEnd) {
		// Go to the beginning of the last line
		const lastLineStart = value.lastIndexOf('\n', currentEnd - 1) + 1
		// There's nothing to unindent after the last cursor, so leave it as is
		if (value.charAt(lastLineStart) !== '\t') {
			return currentEnd
		}
		return lastLineStart + 1 // Include the first character, which will be a tab
	}

	static indent(element) {
		const { selectionStart, selectionEnd, value } = element
		const selectedContrast = value.slice(selectionStart, selectionEnd)
		// The first line should be indented, even if it starts with \n
		// The last line should only be indented if includes any character after \n
		const lineBreakCount = /\n/g.exec(selectedContrast)?.length

		if (lineBreakCount && lineBreakCount > 0) {
			// Select full first line to replace everything at once
			const firstLineStart = value.lastIndexOf('\n', selectionStart - 1) + 1

			const newSelection = element.value.slice(firstLineStart, selectionEnd - 1)
			const indentedText = newSelection.replace(
				/^|\n/g, // Match all line starts
				`$&${INDENT}`
			)
			const replacementsCount = indentedText.length - newSelection.length

			// Replace newSelection with indentedText
			element.setSelectionRange(firstLineStart, selectionEnd - 1)
			TextHelpers.insert(element, indentedText)

			// Restore selection position, including the indentation
			element.setSelectionRange(selectionStart + 1, selectionEnd + replacementsCount)
		} else {
			TextHelpers.insert(element, INDENT)
		}
	}

	// The first line should always be unindented
	// The last line should only be unindented if the selection includes any characters after \n
	static unindent(element) {
		const { selectionStart, selectionEnd, value } = element

		// Select the whole first line because it might contain \t
		const firstLineStart = value.lastIndexOf('\n', selectionStart - 1) + 1
		const minimumSelectionEnd = TextHelpers.findLineEnd(value, selectionEnd)

		const newSelection = element.value.slice(firstLineStart, minimumSelectionEnd)
		const indentedText = newSelection.replace(/(^|\n)(\t| {1,2})/g, '$1')
		const replacementsCount = newSelection.length - indentedText.length

		// Replace newSelection with indentedText
		element.setSelectionRange(firstLineStart, minimumSelectionEnd)
		TextHelpers.insert(element, indentedText)

		// Restore selection position, including the indentation
		const firstLineIndentation = /\t| {1,2}/.exec(value.slice(firstLineStart, selectionStart))

		const difference = firstLineIndentation ? firstLineIndentation[0].length : 0

		const newSelectionStart = selectionStart - difference
		element.setSelectionRange(
			selectionStart - difference,
			Math.max(newSelectionStart, selectionEnd - replacementsCount)
		)
	}

	static indentCE(element) {
		const selection = window.getSelection()
		const value = element.innerText
		const selectionStart = getCaretIndex(element) ?? 0
		const selectionEnd = getCaretIndex(element) ?? 0
		const selectedContrast = value.slice(selectionStart, selectionEnd)
		// The first line should be indented, even if it starts with \n
		// The last line should only be indented if includes any character after \n
		const lineBreakCount = /\n/g.exec(selectedContrast)?.length

		if (lineBreakCount && lineBreakCount > 0) {
			// Select full first line to replace everything at once
			const firstLineStart = value.lastIndexOf('\n', selectionStart - 1) + 1

			const newSelection = value.slice(firstLineStart, selectionEnd - 1)
			const indentedText = newSelection.replace(
				/^|\n/g, // Match all line starts
				`$&${INDENT}`
			)
			const replacementsCount = indentedText.length - newSelection.length

			// Replace newSelection with indentedText

			if (selection) {
				selection.setBaseAndExtent(
					element,
					selectionStart + 1,
					element,
					selectionEnd + replacementsCount
				)
				// element.setSelectionRange(firstLineStart, selectionEnd - 1)
				// TextHelpers.insert(element, indentedText)

				// Restore selection position, including the indentation
				// element.setSelectionRange(selectionStart + 1, selectionEnd + replacementsCount)
			}
		} else {
			const selection = window.getSelection()
			element.innerText = value.slice(0, selectionStart) + INDENT + value.slice(selectionStart)
			selection?.setBaseAndExtent(element, selectionStart + 1, element, selectionStart + 2)
			// TextHelpers.insert(element, INDENT)
		}
	}

	static unindentCE(element) {
		const selection = window.getSelection()
		const value = element.innerText
		// const { selectionStart, selectionEnd } = element
		const selectionStart = getCaretIndex(element) ?? 0
		const selectionEnd = getCaretIndex(element) ?? 0

		// Select the whole first line because it might contain \t
		const firstLineStart = value.lastIndexOf('\n', selectionStart - 1) + 1
		const minimumSelectionEnd = TextHelpers.findLineEnd(value, selectionEnd)

		const newSelection = value.slice(firstLineStart, minimumSelectionEnd)
		const indentedText = newSelection.replace(/(^|\n)(\t| {1,2})/g, '$1')
		const replacementsCount = newSelection.length - indentedText.length

		if (selection) {
			// Replace newSelection with indentedText
			selection.setBaseAndExtent(element, firstLineStart, element, minimumSelectionEnd)
			// TextHelpers.insert(element, indentedText)

			// Restore selection position, including the indentation
			const firstLineIndentation = /\t| {1,2}/.exec(value.slice(firstLineStart, selectionStart))

			const difference = firstLineIndentation ? firstLineIndentation[0].length : 0

			const newSelectionStart = selectionStart - difference
			selection.setBaseAndExtent(
				element,
				selectionStart - difference,
				element,
				Math.max(newSelectionStart, selectionEnd - replacementsCount)
			)
		}
	}

	static fixNewLines = /\r?\n|\r/g

	static normalizeText(text) {
		return text.replace(TextHelpers.fixNewLines, '\n')
	}

	static normalizeTextForDom(text) {
		return text
			.replace(TextHelpers.fixNewLines, '\n')
			.split('\n')
			.map((x) => x || ' ')
			.join('\n')
	}
}

function getCaretIndex(element) {
	if (typeof window.getSelection === 'undefined') return
	const selection = window.getSelection()
	if (!selection) return
	let position = 0
	if (selection.rangeCount !== 0) {
		const range = selection.getRangeAt(0)
		const preCaretRange = range.cloneRange()
		preCaretRange.selectNodeContents(element)
		preCaretRange.setEnd(range.endContainer, range.endOffset)
		position = preCaretRange.toString().length
	}
	return position
}


export function useEditableText(
	id,
	type,
	text
) {
	const editor = useEditor()

	const rInput = useRef(null)
	const rSkipSelectOnFocus = useRef(false)
	const rSelectionRanges = useRef()

	const isEditing = useValue('isEditing', () => editor.getEditingShapeId() === id, [editor, id])

	// If the shape is editing but the input element not focused, focus the element
	useEffect(() => {
		const elm = rInput.current
		if (elm && isEditing && document.activeElement !== elm) {
			elm.focus()
		}
	}, [isEditing])

	// When the label receives focus, set the value to the most  recent text value and select all of the text
	const handleFocus = useCallback(() => {
		// Store and turn off the skipSelectOnFocus flag
		const skipSelect = rSkipSelectOnFocus.current
		rSkipSelectOnFocus.current = false

		// On the next frame, if we're not skipping select AND we have text in the element, then focus the text
		requestAnimationFrame(() => {
			const elm = rInput.current
			if (!elm) return

			const shape = editor.getShape & { props: { text } }>(id)

			if (shape) {
				elm.value = shape.props.text
				if (elm.value.length && !skipSelect) {
					elm.select()
				}
			}
		})
	}, [editor, id])

	// When the label blurs, deselect all of the text and complete.
	// This makes it so that the canvas does not have to be focused
	// in order to exit the editing state and complete the editing state
	const handleBlur = useCallback(() => {
		const ranges = rSelectionRanges.current

		requestAnimationFrame(() => {
			const elm = rInput.current
			const editingShapeId = editor.getEditingShapeId()
			// Did we move to a different shape?
			if (elm && editingShapeId) {
				// important! these ^v are two different things
				// is that shape OUR shape?
				if (editingShapeId === id) {
					if (ranges) {
						if (!ranges.length) {
							// If we don't have any ranges, restore selection
							// and select all of the text
							elm.focus()
						} else {
							// Otherwise, skip the select-all-on-focus behavior
							// and restore the selection
							rSkipSelectOnFocus.current = true
							elm.focus()
							const selection = window.getSelection()
							if (selection) {
								ranges.forEach((range) => selection.addRange(range))
							}
						}
					} else {
						elm.focus()
					}
				}
			} else {
				window.getSelection()?.removeAllRanges()
				editor.complete()
			}
		})
	}, [editor, id])

	// When the user presses ctrl / meta enter, complete the editing state.
	// When the user presses tab, indent or unindent the text.
	const handleKeyDown = useCallback(
		(e) => {
			if (!isEditing) return

			if (e.ctrlKey || e.metaKey) stopEventPropagation(e)

			switch (e.key) {
				case 'Enter': {
					if (e.ctrlKey || e.metaKey) {
						editor.complete()
					}
					break
				}
				case 'Tab': {
					preventDefault(e)
					if (e.shiftKey) {
						TextHelpers.unindent(e.currentTarget)
					} else {
						TextHelpers.indent(e.currentTarget)
					}
					break
				}
			}
		},
		[editor, isEditing]
	)

	// When the text changes, update the text value.
	const handleChange = useCallback(
		(e) => {
			if (!isEditing) return

			let text = TextHelpers.normalizeText(e.currentTarget.value)

			// ------- Bug fix ------------
			// Replace tabs with spaces when pasting
			const untabbedText = text.replace(/\t/g, INDENT)
			if (untabbedText !== text) {
				const selectionStart = e.currentTarget.selectionStart
				e.currentTarget.value = untabbedText
				e.currentTarget.selectionStart = selectionStart + (untabbedText.length - text.length)
				e.currentTarget.selectionEnd = selectionStart + (untabbedText.length - text.length)
				text = untabbedText
			}
			// ----------------------------

			editor.updateShapes([
				{ id, type, props: { text } },
			])
		},
		[editor, id, type, isEditing]
	)

	const isEmpty = text.trim().length === 0

	useEffect(() => {
		if (!isEditing) return

		const elm = rInput.current
		if (elm) {
			function updateSelection() {
				const selection = window.getSelection?.()
				if (selection && selection.type !== 'None') {
					const ranges = []

					if (selection) {
						for (let i = 0; i < selection.rangeCount; i++) {
							ranges.push(selection.getRangeAt?.(i))
						}
					}

					rSelectionRanges.current = ranges
				}
			}

			document.addEventListener('selectionchange', updateSelection)

			return () => {
				document.removeEventListener('selectionchange', updateSelection)
			}
		}
	}, [isEditing])

	const handleInputPointerDown = useCallback(
		(e) => {
			editor.dispatch({
				...getPointerInfo(e),
				type: 'pointer',
				name: 'pointer_down',
				target: 'shape',
				shape: editor.getShape(id),
			})

			stopEventPropagation(e) // we need to prevent blurring the input
		},
		[editor, id]
	)

	const handleDoubleClick = stopEventPropagation

	return {
		rInput,
		isEditing,
		handleFocus,
		handleBlur,
		handleKeyDown,
		handleChange,
		handleInputPointerDown,
		handleDoubleClick,
		isEmpty,
	}
}






export const LABEL_FONT_SIZES = {
	s: 18,
	m: 22,
	l: 26,
	xl: 32,
}

export const FONT_SIZES = {
	s: 18,
	m: 24,
	l: 36,
	xl: 44,
}

export const TEXT_PROPS = {
	lineHeight: 1.35,
	fontWeight: 'normal',
	fontVariant: 'normal',
	fontStyle: 'normal',
	padding: '0px',
}

export const FONT_FAMILIES = {
	draw: 'var(--tl-font-draw)',
	sans: 'var(--tl-font-sans)',
	serif: 'var(--tl-font-serif)',
	mono: 'var(--tl-font-mono)',
}



export const getDataUri = ()=>{
    return (
        "data:image/svg+xml;base64," + btoa(`<svg xmlns="http://www.w3.org/2000/svg" xmlSpace="preserve" width="0.375843in" height="0.563764in" version="1.1" style="shape-rendering:geometricPrecision; text-rendering:geometricPrecision; image-rendering:optimizeQuality; fillRule:evenodd; clip-rule:evenodd"
        viewBox="0 0 375.84 563.76"
         xmlnsXlink="http://www.w3.org/1999/xlink">
         <defs>
         </defs>
         <g id="Layer_x0020_1">
          <metadata id="CorelCorpID_0Corel-Layer"/>
          <g id="_2472952905120">
           <g>
            <rect x="93.52" y="83.47" width="188.8" fill="white" height="197.39" stroke="white" strokeWidth="7.87" strokeMiterlimit="22.9256" />
            <g>
             <path d="M187.92 0c-103.78,0 -187.92,84.14 -187.92,187.92 0,33.38 8.96,64.59 24.22,91.76 2.53,4.51 5.2,8.95 8.08,13.23l155.63 270.86 155.62 -270.86c2.4,-3.56 4.46,-7.31 6.6,-11.02l1.48 -2.21c15.24,-27.16 24.22,-58.37 24.22,-91.76 0,-103.78 -84.14,-187.92 -187.92,-187.92zm0 93.96c51.89,0 93.96,42.06 93.96,93.96 0,51.89 -42.07,93.96 -93.96,93.96 -51.89,0 -93.96,-42.07 -93.96,-93.96 0,-51.89 42.06,-93.96 93.96,-93.96z" fill="white" fillRule="nonzero" />
             <path d="M187.92 70.46c-64.86,0 -117.45,52.58 -117.45,117.45 0,64.85 52.59,117.44 117.45,117.44 64.85,0 117.44,-52.59 117.44,-117.44 0,-64.87 -52.59,-117.45 -117.44,-117.45zm0 46.98c38.92,0 70.47,31.56 70.47,70.48 0,38.92 -31.54,70.47 -70.47,70.47 -38.93,0 -70.48,-31.55 -70.48,-70.47 0,-38.92 31.54,-70.48 70.48,-70.48z" fill="white" fillRule="nonzero" />
            </g>
            <path d="M187.92 11.46c-97.04,0 -175.7,78.67 -175.7,175.7 0,31.21 8.39,60.4 22.65,85.79 2.37,4.22 4.85,8.37 7.56,12.37l145.5 253.25 145.51 -253.25c2.24,-3.32 4.17,-6.83 6.17,-10.3l1.39 -2.07c14.25,-25.39 22.64,-54.58 22.64,-85.79 0,-97.04 -78.67,-175.7 -175.7,-175.7zm0 87.85c48.52,0 87.85,39.33 87.85,87.85 0,48.52 -39.34,87.85 -87.85,87.85 -48.52,0 -87.85,-39.34 -87.85,-87.85 0,-48.52 39.33,-87.85 87.85,-87.85z" fill="#ED0008" fillRule="nonzero" />
            <path d="M187.92 77.34c-60.65,0 -109.81,49.17 -109.81,109.81 0,60.64 49.17,109.81 109.81,109.81 60.64,0 109.81,-49.17 109.81,-109.81 0,-60.65 -49.18,-109.81 -109.81,-109.81zm0 43.93c36.39,0 65.89,29.5 65.89,65.89 0,36.39 -29.49,65.89 -65.89,65.89 -36.4,0 -65.89,-29.5 -65.89,-65.89 0,-36.39 29.49,-65.89 65.89,-65.89z" fill="#B30006" fillRule="nonzero" />
           </g>
           <rect x="93.52" y="83.47" width="188.8" height="197.39" fill="white" stroke="white" strokeWidth="7.87" strokeMiterlimit="22.9256"/>
           <g>
            <path d="M187.92 0c-103.78,0 -187.92,84.14 -187.92,187.92 0,33.38 8.96,64.59 24.22,91.76 2.53,4.51 5.2,8.95 8.08,13.23l155.63 270.86 155.62 -270.86c2.4,-3.56 4.46,-7.31 6.6,-11.02l1.48 -2.21c15.24,-27.16 24.22,-58.37 24.22,-91.76 0,-103.78 -84.14,-187.92 -187.92,-187.92zm0 93.96c51.89,0 93.96,42.06 93.96,93.96 0,51.89 -42.07,93.96 -93.96,93.96 -51.89,0 -93.96,-42.07 -93.96,-93.96 0,-51.89 42.06,-93.96 93.96,-93.96z" fill="white" fillRule="nonzero" />
            <path d="M187.92 70.46c-64.86,0 -117.45,52.58 -117.45,117.45 0,64.85 52.59,117.44 117.45,117.44 64.85,0 117.44,-52.59 117.44,-117.44 0,-64.87 -52.59,-117.45 -117.44,-117.45zm0 46.98c38.92,0 70.47,31.56 70.47,70.48 0,38.92 -31.54,70.47 -70.47,70.47 -38.93,0 -70.48,-31.55 -70.48,-70.47 0,-38.92 31.54,-70.48 70.48,-70.48z" fill="white" fillRule="nonzero" />
           </g>
           <path d="M187.92 11.46c-97.04,0 -175.7,78.67 -175.7,175.7 0,31.21 8.39,60.4 22.65,85.79 2.37,4.22 4.85,8.37 7.56,12.37l145.5 253.25 145.51 -253.25c2.24,-3.32 4.17,-6.83 6.17,-10.3l1.39 -2.07c14.25,-25.39 22.64,-54.58 22.64,-85.79 0,-97.04 -78.67,-175.7 -175.7,-175.7zm0 87.85c48.52,0 87.85,39.33 87.85,87.85 0,48.52 -39.34,87.85 -87.85,87.85 -48.52,0 -87.85,-39.34 -87.85,-87.85 0,-48.52 39.33,-87.85 87.85,-87.85z" fill="#C72E33" fillRule="nonzero" />
           <path d="M187.92 77.34c-60.65,0 -109.81,49.17 -109.81,109.81 0,60.64 49.17,109.81 109.81,109.81 60.64,0 109.81,-49.17 109.81,-109.81 0,-60.65 -49.18,-109.81 -109.81,-109.81zm0 43.93c36.39,0 65.89,29.5 65.89,65.89 0,36.39 -29.49,65.89 -65.89,65.89 -36.4,0 -65.89,-29.5 -65.89,-65.89 0,-36.39 29.49,-65.89 65.89,-65.89z" fill="#B30006" fillRule="nonzero" />
           <g>
            <rect x="93.52" y="83.47" width="188.8" height="197.39" fill="white" stroke="white" strokeWidth="7.87" strokeMiterlimit="22.9256"/>
            <g>
             <path d="M187.92 0c-103.78,0 -187.92,84.14 -187.92,187.92 0,33.38 8.96,64.59 24.22,91.76 2.53,4.51 5.2,8.95 8.08,13.23l155.63 270.86 155.62 -270.86c2.4,-3.56 4.46,-7.31 6.6,-11.02l1.48 -2.21c15.24,-27.16 24.22,-58.37 24.22,-91.76 0,-103.78 -84.14,-187.92 -187.92,-187.92zm0 93.96c51.89,0 93.96,42.06 93.96,93.96 0,51.89 -42.07,93.96 -93.96,93.96 -51.89,0 -93.96,-42.07 -93.96,-93.96 0,-51.89 42.06,-93.96 93.96,-93.96z" fill="white" fillRule="nonzero" />
             <path d="M187.92 70.46c-64.86,0 -117.45,52.58 -117.45,117.45 0,64.85 52.59,117.44 117.45,117.44 64.85,0 117.44,-52.59 117.44,-117.44 0,-64.87 -52.59,-117.45 -117.44,-117.45zm0 46.98c38.92,0 70.47,31.56 70.47,70.48 0,38.92 -31.54,70.47 -70.47,70.47 -38.93,0 -70.48,-31.55 -70.48,-70.47 0,-38.92 31.54,-70.48 70.48,-70.48z" fill="white" fillRule="nonzero" />
            </g>
            <path d="M187.92 11.46c-97.04,0 -175.7,78.67 -175.7,175.7 0,31.21 8.39,60.4 22.65,85.79 2.37,4.22 4.85,8.37 7.56,12.37l145.5 253.25 145.51 -253.25c2.24,-3.32 4.17,-6.83 6.17,-10.3l1.39 -2.07c14.25,-25.39 22.64,-54.58 22.64,-85.79 0,-97.04 -78.67,-175.7 -175.7,-175.7zm0 87.85c48.52,0 87.85,39.33 87.85,87.85 0,48.52 -39.34,87.85 -87.85,87.85 -48.52,0 -87.85,-39.34 -87.85,-87.85 0,-48.52 39.33,-87.85 87.85,-87.85z" fill="#ED0008" fillRule="nonzero" />
            <path d="M187.92 77.34c-60.65,0 -109.81,49.17 -109.81,109.81 0,60.64 49.17,109.81 109.81,109.81 60.64,0 109.81,-49.17 109.81,-109.81 0,-60.65 -49.18,-109.81 -109.81,-109.81zm0 43.93c36.39,0 65.89,29.5 65.89,65.89 0,36.39 -29.49,65.89 -65.89,65.89 -36.4,0 -65.89,-29.5 -65.89,-65.89 0,-36.39 29.49,-65.89 65.89,-65.89z" fill="#B30006" fillRule="nonzero" />
           </g>
           <rect x="93.52" y="83.47" width="188.8" height="197.39" fill="white" stroke="white" strokeWidth="7.87" strokeMiterlimit="22.9256"/>
           <g>
            <path d="M187.92 0c-103.78,0 -187.92,84.14 -187.92,187.92 0,33.38 8.96,64.59 24.22,91.76 2.53,4.51 5.2,8.95 8.08,13.23l155.63 270.86 155.62 -270.86c2.4,-3.56 4.46,-7.31 6.6,-11.02l1.48 -2.21c15.24,-27.16 24.22,-58.37 24.22,-91.76 0,-103.78 -84.14,-187.92 -187.92,-187.92zm0 93.96c51.89,0 93.96,42.06 93.96,93.96 0,51.89 -42.07,93.96 -93.96,93.96 -51.89,0 -93.96,-42.07 -93.96,-93.96 0,-51.89 42.06,-93.96 93.96,-93.96z" fill="white" fillRule="nonzero" />
            <path d="M187.92 70.46c-64.86,0 -117.45,52.58 -117.45,117.45 0,64.85 52.59,117.44 117.45,117.44 64.85,0 117.44,-52.59 117.44,-117.44 0,-64.87 -52.59,-117.45 -117.44,-117.45zm0 46.98c38.92,0 70.47,31.56 70.47,70.48 0,38.92 -31.54,70.47 -70.47,70.47 -38.93,0 -70.48,-31.55 -70.48,-70.47 0,-38.92 31.54,-70.48 70.48,-70.48z" fill="white" fillRule="nonzero" />
           </g>
           <path d="M187.92 11.46c-97.04,0 -175.7,78.67 -175.7,175.7 0,31.21 8.39,60.4 22.65,85.79 2.37,4.22 4.85,8.37 7.56,12.37l145.5 253.25 145.51 -253.25c2.24,-3.32 4.17,-6.83 6.17,-10.3l1.39 -2.07c14.25,-25.39 22.64,-54.58 22.64,-85.79 0,-97.04 -78.67,-175.7 -175.7,-175.7zm0 87.85c48.52,0 87.85,39.33 87.85,87.85 0,48.52 -39.34,87.85 -87.85,87.85 -48.52,0 -87.85,-39.34 -87.85,-87.85 0,-48.52 39.33,-87.85 87.85,-87.85z" fill="#EF453F" fillRule="nonzero" />
           <path d="M187.92 77.34c-60.65,0 -109.81,49.17 -109.81,109.81 0,60.64 49.17,109.81 109.81,109.81 60.64,0 109.81,-49.17 109.81,-109.81 0,-60.65 -49.18,-109.81 -109.81,-109.81zm0 43.93c36.39,0 65.89,29.5 65.89,65.89 0,36.39 -29.49,65.89 -65.89,65.89 -36.4,0 -65.89,-29.5 -65.89,-65.89 0,-36.39 29.49,-65.89 65.89,-65.89z" fill="#B30006" fillRule="nonzero" />
          </g>
         </g>
        </svg>`)
    )
}

