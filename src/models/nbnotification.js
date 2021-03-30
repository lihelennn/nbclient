class NbNotification {
    constructor (title, comment, triggerPopup=false){
        this.title = title
        this.comment = comment 
        this.unseen = true
        this.triggerPopup = triggerPopup
    }

    setIsUnseen(val) {
        this.unseen = val
    }
}

export default NbNotification