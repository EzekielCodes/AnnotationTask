import { useContext} from "react";
import cameraIcon from "../../assets/OOjs_UI_icon_camera.svg";
import styles from "./index.module.css";
import {ImgContext} from "../../context/img-context";

const SelectImg = ()=>{
    // const [image, setImage] = useState(null);

    const imgContext = useContext(ImgContext);

    const getFile = (e) => {
      const f = e.target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
          const i = reader.result;
        //   setImage(i);
          imgContext.getImg(i);
      }
      reader.readAsDataURL(f);
    //   setImage(f);
    }
    
    return(
      <div className={styles.img_container} >
        <label htmlFor="fileInput" className={styles.image_label}>
            <img className={styles.cameraIcon} src={cameraIcon} alt="camera" />
            <input type="file" accept="image/png, image/jpg, image/jpeg" id="fileInput" className={styles.imgInput} onChange={getFile} />
        </label>
      </div>
    )
}

export default SelectImg;