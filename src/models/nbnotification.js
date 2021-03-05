class NbNotification {
    constructor (title, comment){
        this.title = title
        this.comment = comment 
        this.unseen = true
    }

    setIsUnseen(val) {
        this.unseen = val
    }
}

export default NbNotification