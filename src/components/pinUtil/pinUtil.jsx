import {
	Rectangle2d,
	ShapeUtil,
	resizeBox,
	HTMLContainer,
	Vec2d
} from '@tldraw/tldraw';


// import locationSvg from "../../assets/.svg";
import { getDataUri } from '../../utils/utils';

const uri = getDataUri();

function getContainerStyle(shape) {
	const crop = shape.props.crop
	const topLeft = crop?.topLeft
	if (!topLeft) {
		return {
			width: shape.props.w,
			height: shape.props.h,
		}
	}

	const w = (1 / (crop.bottomRight.x - crop.topLeft.x)) * shape.props.w
	const h = (1 / (crop.bottomRight.y - crop.topLeft.y)) * shape.props.h

	const offsetX = -topLeft.x * w
	const offsetY = -topLeft.y * h
	return {
		transform: `translate(${offsetX}px, ${offsetY}px)`,
		width: w,
		height: h,
	}
}


export class PinUtil extends ShapeUtil{
    static type = 'pin'

	// Flags
	isAspectRatioLocked = () => false
	canResize = () => true
	canBind = () => true


    getDefaultProps() {
		return {
			w: 40,
			h: 40,
			color: 'tr',
			weight: 'regular',
			url: uri
		}
	}

    getGeometry(shape) {
		return new Rectangle2d({
			width: shape.props.w,
			height: shape.props.h,
			isFilled: true,
	
		})
	}

    component(shape) {

		return (
			<HTMLContainer
				id={shape.id}
				style={{
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					justifyContent: 'center',
					pointerEvents: 'all',
					backgroundColor: "transparent",
					fontWeight: shape.props.weight,
					fontSize: "1.6rem",

					// color: theme[shape.props.color].solid,
				}}
			>
				<div style={{position: "absolute", top: "0", left: "0", height: "100%", width: "100%",backgroundColor: "transparent"}} >
				</div>
				<img src={shape.props.url} style={{ pointerEvents: "all", width: "100%", height: "100%", }} alt='pin' />
			</HTMLContainer>
		)
	}

    indicator(shape) {
		return <rect width={shape.props.w} height={shape.props.h} />
	}

    onResize = (shape, info) => {
		return resizeBox(shape, info)
	}


	toSvg(shape) {
		const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')
		const asset = shape.props.assetId ? this.editor.getAsset(shape.props.assetId) : null

		let src = asset?.props.url || shape.props.url || "";
		// if (src && src.startsWith('http')) {
		// 	// If it's a remote image, we need to fetch it and convert it to a data URI
		// 	src = (await getDataURIFromURL(src)) || ''
		// }

		const image = document.createElementNS('http://www.w3.org/2000/svg', 'image')
		image.setAttributeNS('http://www.w3.org/1999/xlink', 'href', src)
		const containerStyle = getContainerStyle(shape)
		const crop = shape.props.crop
		if (containerStyle.transform && crop) {
			const { transform, width, height } = containerStyle
			const croppedWidth = (crop.bottomRight.x - crop.topLeft.x) * width
			const croppedHeight = (crop.bottomRight.y - crop.topLeft.y) * height

			const points = [
				new Vec2d(0, 0),
				new Vec2d(croppedWidth, 0),
				new Vec2d(croppedWidth, croppedHeight),
				new Vec2d(0, croppedHeight),
			]

			const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon')
			polygon.setAttribute('points', points.map((p) => `${p.x},${p.y}`).join(' '))

			const clipPath = document.createElementNS('http://www.w3.org/2000/svg', 'clipPath')
			clipPath.setAttribute('id', 'cropClipPath')
			clipPath.appendChild(polygon)

			const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs')
			defs.appendChild(clipPath)
			g.appendChild(defs)

			const innerElement = document.createElementNS('http://www.w3.org/2000/svg', 'g')
			innerElement.setAttribute('clip-path', 'url(#cropClipPath)')
			image.setAttribute('width', width.toString())
			image.setAttribute('height', height.toString())
			image.style.transform = transform
			innerElement.appendChild(image)
			g.appendChild(innerElement)
		} else {
			image.setAttribute('width', shape.props.w.toString())
			image.setAttribute('height', shape.props.h.toString())
			g.appendChild(image)
		}

		return g
	}

}