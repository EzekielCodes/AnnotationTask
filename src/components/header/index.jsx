import styles from "./index.module.css";



const Navbar =()=>{

    return(
        <div className={styles.header}>
            <h3 className={styles.logo}>ANNOTATION TOOL</h3>
            <div className={styles.profile_container}>
                <figcaption className={styles.profile_box}>
                    <p>Profile</p>
                    <span></span>
                </figcaption>
            </div>
        </div>
    )
}

export default Navbar;