import { createContext, useState } from "react";

export const ImgContext = createContext({
    image: "",
    getImg: ()=>{},
    open: false,
    close: ()=>{}
});

const ImgContextProvider = (props) => {
    const [image, setImage] = useState(null);
    const [open, setOpen] = useState(false);

    const getImage = (_img)=>{
        setImage(_img);
        setOpen(true);
    };

    const close = ()=>{
        setOpen(false);
    }

    return (
        <ImgContext.Provider value={{image: image, getImg: getImage, open: open, close: close }} >
            {props.children}
        </ImgContext.Provider>
    )
}

export default ImgContextProvider;

