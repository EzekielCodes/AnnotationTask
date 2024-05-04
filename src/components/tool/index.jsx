import { useRef} from "react";
import styles from "./index.module.css";
import { Tldraw } from '@tldraw/tldraw';
import '@tldraw/tldraw/tldraw.css';
import {PinUtil} from "../pinUtil/pinUtil";
import {PinShapeTool} from "../pinUtil/pinTool";
import {uiOverrides} from "../pinUtil/ui-overrides"
import {customComponents} from "../screenshotUtil/screenshotUtil";
import { LabelShapeTool } from "../labelUtil/labelTool";
import { LablShapeUtil } from "../labelUtil/labelUtil";

// There's a guide at the bottom of this file!

// [1]
const customShapeUtils = [LablShapeUtil, PinUtil];
const customShapeTools = [LabelShapeTool, PinShapeTool];
const customAssetUrls = {
	icons: {
		'pinIcon': '/PinVector.svg',
	},
}

const Tool = ()=>{
    const stageRef = useRef(null);


    const closeImgContainer = ()=>{
        close();
    }


    return (
        <div className={`${styles.tool_container} ${open ? "" : styles.hide}`}>
            <div className={styles.tool}>
                <figure className={styles.close} onClick={closeImgContainer}>
                     <svg width="20" height="20" viewBox="0 0 21 20" fill="none" xmlns="http:www.w3.org/2000/svg">
                         <path d="M14.4697 15.0303C14.7626 15.3232 15.2374 15.3232 15.5303 15.0303C15.8232 14.7374 15.8232 14.2626 15.5303 13.9697L11.5607 10L15.5303 6.03033C15.8232 5.73744 15.8232 5.26256 15.5303 4.96967C15.2374 4.67678 14.7626 4.67678 14.4697 4.96967L10.5 8.93934L6.53033 4.96967C6.23744 4.67678 5.76256 4.67678 5.46967 4.96967C5.17678 5.26256 5.17678 5.73744 5.46967 6.03033L9.43934 10L5.46967 13.9697C5.17678 14.2626 5.17678 14.7374 5.46967 15.0303C5.76256 15.3232 6.23744 15.3232 6.53033 15.0303L10.5 11.0607L14.4697 15.0303Z" fill="#fff"/>
                     </svg>
                </figure>
			<Tldraw forwardRef={stageRef} acceptedImageMimeTypes={["image/jpeg"]} assetUrls={customAssetUrls} tools={customShapeTools} shapeUtils={customShapeUtils} overrides={uiOverrides} components={customComponents} />
            </div>
		</div>
    )
}



export default Tool;