import htmlToText from 'html-to-text'
import axios from 'axios'
import { CommentVisibility, CommentAnonymity } from './enums.js'
import { compare } from '../utils/compare-util.js'

/** Class representing a comment (thread head or reply) in NB. */
class NbComment {
  /**
   * Create a range of text in NB.
   * @param {Object} data
   * @param {?String} data.id - comment ID, sets {@link NbComment#id}
   * @param {?NbRange} data.range - range of text, sets {@link NbComment#range}
   * @param {?NbComment} data.parent - comment this replies to, sets {@link NbComment#parent}
   * @param {?String} data.timestamp - posted timestamp, sets {@link NbComment#timestamp}
   * @param {String} data.author - the author's user ID, sets {@link NbComment#author}
   * @param {String} data.authorName - the author's display name, sets {@link NbComment#authorName}
   * @param {Boolean} data.instructor - true if the author is an instructor, sets {@link NbComment#instructor}
   * @param {String} data.html - HTML string of the comment content, sets {@link NbComment#html}
   * @param {Array<String>} data.hashtags - array of IDs for hashtags in this comment, sets {@link NbComment#hashtags}
   * @param {Array<String>} data.people - array of user IDs for people tagged in this comment, sets {@link NbComment#people}
   * @param {CommentVisibility} data.visibility - who can view this comment, sets {@link NbComment#visibility}
   * @param {CommentAnonymity} data.anonymity - how the author is identified, sets {@link NbComment#anonymity}
   * @param {Boolean} data.replyRequestedByMe - true if the current user requested reply for this comment, sets {@link NbComment#replyRequestedByMe}
   * @param {Number} data.replyRequestCount - total reply requests for this comment, sets {@link NbComment#replyRequestCount}
   * @param {Boolean} data.starredByMe - true if the current user upvoted this comment, sets {@link NbComment#upvotedByMe}
   * @param {Number} data.starCount - total upvotes for this comment, sets {@link NbComment#upvoteCount}
   * @param {Boolean} data.seenByMe - true if the current user's seen this comment, sets {@link NbComment#seenByMe}
   * @param {Boolean} data.bookmarked - true if the current user bookmarked this comment, sets {@link NbComment#bookmarked}
   */
  constructor (data, annotationsData) {
    /**
     * ID of this comment. If this is a new comment,
     * null and set later in {@link NbComment#submitAnnotation}.
     * @name NbComment#id
     * @type ?String
     */
    this.id = data.id

    /**
     * Range of text corresponding to this comment. Null if this is a reply.
     * @name NbComment#range
     * @type ?NbRange
     */
    this.range = data.range

    /**
     * Comment this replies to. Null if this is a thread head.
     * @name NbComment#parent
     * @type ?NbComment
     */
    this.parent = data.parent

    /**
     * List of replies made to this comment. If this is NOT a new comment,
     * loaded asynchronously via {@link NbComment#loadReplies}.
     * @name NbComment#children
     * @type Array<NbComment>
     * @default []
     */
    this.children = []
    if (this.id) {
      this.loadReplies(annotationsData)
    }

    /**
     * Timestamp when this comment was posted. If this is a new comment,
     * null and set to the current time.
     * @name NbComment#timestamp
     * @type String
     * @default Date.now()
     */
    if (data.timestamp) {
      let date = new Date(data.timestamp.replace(' ', 'T'))
      this.timestamp = date.getTime()
    } else {
      this.timestamp = Date.now()
    }

    /**
     * User ID of this comment's author.
     * @name NbComment#author
     * @type String
     */
    this.author = data.author

    /**
     * Display name (first + last name) of this comment's author.
     * @name NbComment#authorName
     * @type String
     */
    this.authorName = data.authorName

    /**
     * Flag for instructor comment. True if the author is an instructor.
     * @name NbComment#instructor
     * @type Boolean
     */
    this.instructor = data.instructor

    /**
     * HTML string of this comment's content.
     * @name NbComment#html
     * @type String
     */
    this.html = data.html

    /**
     * Array of hashtag IDs for the hashtags used in this comment.
     * @name NbComment#hashtags
     * @type Array<String>
     */
    this.hashtags = data.hashtags

    /**
     * Array of user IDs for people tagged in this comment.
     * @name NbComment#people
     * @type Array<String>
     */
    this.people = data.people

    /**
     * Flag for who can view this comment.
     * @name NbComment#visibility
     * @type CommentVisibility
     */
    this.visibility = data.visibility

    /**
     * Flag for how the author is identified.
     * @name NbComment#anonymity
     * @type CommentAnonymity
     */
    this.anonymity = data.anonymity

    /**
     * Flag for the current user's reply request.
     * True if the current user requested reply for this comment.
     * @name NbComment#replyRequestedByMe
     * @type Boolean
     */
    this.replyRequestedByMe = data.replyRequestedByMe

    /**
     * Total number of reply requests for this comment.
     * @name NbComment#replyRequestCount
     * @type Number
     */
    this.replyRequestCount = data.replyRequestCount

    /**
     * Flag for the current user's upvote.
     * True if the current user upvoted this comment.
     * @name NbComment#upvotedByMe
     * @type Boolean
     */
    this.upvotedByMe = data.starredByMe

    /**
     * Total number of upvotes for this comment.
     * @name NbComment#upvoteCount
     * @type Number
     */
    this.upvoteCount = data.starCount

    /**
     * Flag for seen comment. True if the current user's seen this comment.
     * @name NbComment#seenByMe
     * @type Boolean
     */
    this.seenByMe = data.seenByMe

    /**
     * Flag for bookmark. True if the current user's bookmarked this comment.
     * @name NbComment#bookmarked
     * @type Boolean
     */
    this.bookmarked = data.bookmarked

    /**
     * This comment's content in plaintext, set in {@link NbComment#setText}.
     * @name NbComment#text
     * @type String
     */
    /**
     * Total number of words in this comment's content,
     * set in {@link NbComment#setText}.
     * @name NbComment#wordCount
     * @type Number
     */
    this.setText()
  }

  /**
   * Set {@link NbComment#text} and {@link NbComment#wordCount}
   * using this comment's content defined in {@link NbComment#html}.
   */
  setText () {
    if (this.html.includes('ql-formula')) { // work around for latex formula
      let temp = document.createElement('div')
      temp.innerHTML = this.html
      for (let formula of temp.querySelectorAll('span.ql-formula')) {
        let span = document.createElement('span')
        span.textContent = formula.getAttribute('data-value')
        formula.parentNode.replaceChild(span, formula)
      }
      this.text = temp.textContent
    } else {
      this.text = htmlToText.fromString(this.html, { wordwrap: false })
    }
    this.wordCount = this.text.split(' ').length

    this.typing = false
  }

  /**
   * Save this comment as a new comment on the backend.
   * On success, set {@link NbComment#id}. If this is a thread head,
   * {@link NbComment#loadReplies} will be called to also load replies.
   */
  submitAnnotation (classId, sourceUrl) {
    const token = localStorage.getItem("nb.user");
    const headers = { headers: { Authorization: 'Bearer ' + token }}
    if (!this.parent) {
      return axios.post('/api/annotations/annotation', {
        url: sourceUrl,
        class: classId,
        content: this.html,
        range: this.range.serialize(),
        author: this.author,
        tags: this.hashtags,
        userTags: this.people,
        visibility: CommentVisibility[this.visibility],
        anonymity: CommentAnonymity[this.anonymity],
        replyRequest: this.replyRequestedByMe,
        star: this.upvotedByMe,
        bookmark: this.bookmarked
      }, headers).then(res => {
        this.id = res.data.id
        // this.loadReplies()
      })
    } else {
      return axios.post(`/api/annotations/reply/${this.parent.id}`, {
        content: this.html,
        author: this.author,
        tags: this.hashtags,
        userTags: this.people,
        visibility: CommentVisibility[this.visibility],
        anonymity: CommentAnonymity[this.anonymity],
        replyRequest: this.replyRequestedByMe,
        star: this.upvotedByMe,
        bookmark: this.bookmarked
      }, headers).then(res => {
        this.id = res.data.id
      })
    }
  }

  /**
   * Async load replies to this comment and add to {@link NbComment#children}.
   * Replies are sorted in the ascending order of {@link NbComment#timestamp}.
   */
  loadReplies (annotationsData) {
    if (this.id in annotationsData) { // {thread_id: [children]}
      this.children = annotationsData[this.id].map(item => {
        item.parent = this 
        return new NbComment(item, annotationsData)
      })
      this.children.sort(compare('timestamp'))
    }



    // axios.get(`/api/annotations/reply/${this.id}`).then(res => {
    //   this.children = res.data.map(item => {
    //     item.parent = this
    //     return new NbComment(item)
    //   })
    //   this.children.sort(compare('timestamp'))
    // })



    // axios.get(`/api/annotations/all_reply/${this.id}`).then(res => {
    //   console.log(res.data)
    // })
  }

  /**
   * Count total number of replies to this comment recursively,
   * including replies to the replies to this comment, etc.
   * @return {Number} Total number of replies to this comment
   */
  countAllReplies () {
    let total = this.children.length
    for (let child of this.children) {
      total += child.countAllReplies()
    }
    return total
  }

  /**
   * Count total number of reply requests to this comment recursively,
   * including reply requests to the replies to this comment, etc.
   * @return {Number} Total number of reply requests to this comment
   */
  countAllReplyReqs () {
    let total = this.replyRequestCount
    for (let child of this.children) {
      total += child.countAllReplyReqs()
    }
    return total
  }

  /**
   * Count total number of upvotes to this comment recursively,
   * including upvotes to the replies to this comment, etc.
   * @return {Number} Total number of upvotes to this comment
   */
  countAllUpvotes () {
    let total = this.upvoteCount
    for (let child of this.children) {
      total += child.countAllUpvotes()
    }
    return total
  }

  /**
   * Check recursively if this comment (or descendant) contains the given text.
   *
   * @param {String} text
   * @return {Boolean} True if the given text (case insensitive) is found
   */
  hasText (text) {
    if (this.text.toLowerCase().includes(text.toLowerCase())) {
      return true
    }
    for (let child of this.children) {
      if (child.hasText(text)) {
        return true
      }
    }
    return false
  }

  /**
   * Check recursively if this comment (or descendant)
   * has {@link NbComment#authorName} containing the given text.
   *
   * If the given text starts with '@' and other characters follow
   * (autocompleted user names), the first '@' character is ignored.
   *
   * @param {String} text
   * @return {Boolean} True if the given text (case insensitive) is found
   */
  hasAuthor (text) {
    let searchText = text.toLowerCase()
    if (searchText.length > 1 && searchText.charAt(0) === '@') {
      // for autocompleted name
      searchText = searchText.substring(1)
    }
    if (this.authorName.toLowerCase().includes(searchText)) {
      return true
    }
    for (let child of this.children) {
      if (child.hasAuthor(text)) {
        return true
      }
    }
    return false
  }

  /**
   * Check recursively if this comment (or descendant) is bookmarked by the current user.
   * @return {Boolean} True if this comment (or descendant) is bookmarked
   */
  hasBookmarks () {
    if (this.bookmarked) {
      return true
    }
    for (let child of this.children) {
      if (child.hasBookmarks()) {
        return true
      }
    }
    return false
  }

  /**
   * Check recursively if this comment (or descendant) contains the hashtag
   * defined by the given hashtag ID.
   *
   * @param {String} hashtag - hashtag ID
   * @return {Boolean} True if the given hashtag is found
   */
  hasHashtag (hashtag) {
    if (this.hashtags.includes(hashtag)) {
      return true
    }
    for (let child of this.children) {
      if (child.hasHashtag(hashtag)) {
        return true
      }
    }
    return false
  }

  /**
   * Check recursively if this comment (or descendant) tags the user
   * defined by the given user ID.
   *
   * @param {String} userID - user ID
   * @return {Boolean} True if the given user is tagged
   */
  hasUserTag (userID) {
    if (this.people.includes(userID)) {
      return true
    }
    for (let child of this.children) {
      if (child.hasUserTag(userID)) {
        return true
      }
    }
    return false
  }

  /**
   * Check recursively if this comment (or descendant) is authored by instructor.
   * @return {Boolean} True if this comment (or descendant) is authored by instructor
   */
  hasInstructorPost () {
    if (this.instructor) { return true }
    for (let child of this.children) {
      if (child.hasInstructorPost()) {
        return true
      }
    }
    return false
  }

  /**
   * Check recursively if this comment (or descendant) is authored by the user
   * defined by the given user ID.
   *
   * @param {String} userID - user ID
   * @return {Boolean} True if the given user authored this comment (or descendant)
   */
  hasUserPost (userID) {
    if (this.author === userID) { return true }
    for (let child of this.children) {
      if (child.hasUserPost(userID)) {
        return true
      }
    }
    return false
  }

  /**
   * Check recursively if this comment (or descendant) has any reply requests.
   * @return {Boolean} True if this comment (or descendant) has any reply requests.
   */
  hasReplyRequests () {
    if (this.replyRequestCount > 0) { return true }
    for (let child of this.children) {
      if (child.hasReplyRequests()) {
        return true
      }
    }
    return false
  }

  /**
   * Check recursively if this comment (or descendant) has any reply requests by the current user.
   * @return {Boolean} True if this comment (or descendant) has any reply requests by the current user.
   */
  hasMyReplyRequests () {
    if (this.replyRequestedByMe) { return true }
    for (let child of this.children) {
      if (child.hasMyReplyRequests()) {
        return true
      }
    }
    return false
  }

  /**
   * Check recursively if this comment (or descendant) has any upvotes.
   * @return {Boolean} True if this comment (or descendant) has any upvotes.
   */
  hasUpvotes () {
    if (this.upvoteCount > 0) { return true }
    for (let child of this.children) {
      if (child.hasUpvotes()) {
        return true
      }
    }
    return false
  }

  /**
   * Check recursively if this comment (or descendant) has any upvotes by the current user.
   * @return {Boolean} True if this comment (or descendant) has any upvotes by the current user.
   */
  hasMyUpvotes () {
    if (this.upvotedByMe) { return true }
    for (let child of this.children) {
      if (child.hasMyUpvotes()) {
        return true
      }
    }
    return false
  }

  /**
   * Check recursively if this comment (or descendant) hasn't been seen by the current user.
   * @return {Boolean} True if this comment (or descendant) hasn't been seen by the current user
   */
  isUnseen () {
    if (!this.seenByMe) { return true }
    for (let child of this.children) {
      if (child.isUnseen()) {
        return true
      }
    }
    return false
  }

  /**
   * Mark this comment and all its descendants as seen by the current user.
   */
  markSeenAll () { // mark this comment and all replies 'seen'
    if (!this.seenByMe) {
      this.seenByMe = true
      const token = localStorage.getItem("nb.user");
      const headers = { headers: { Authorization: 'Bearer ' + token }}
      axios.post(`/api/annotations/seen/${this.id}`,{} ,headers)
    }
    for (let child of this.children) {
      child.markSeenAll()
    }
  }

  /**
   * Toggle the upvote for this comment by the current user.
   */
  toggleUpvote () {
    if (this.upvotedByMe) {
      this.upvoteCount -= 1
      this.upvotedByMe = false
    } else {
      this.upvoteCount += 1
      this.upvotedByMe = true
    }
    if (this.id) {
      const token = localStorage.getItem("nb.user");
      const headers = { headers: { Authorization: 'Bearer ' + token }}
      axios.post(`/api/annotations/star/${this.id}`, { star: this.upvotedByMe }, headers)
    }
  }

  /**
   * Toggle the reply request for this comment by the current user.
   */
  toggleReplyRequest () {
    if (this.replyRequestedByMe) {
      this.replyRequestCount -= 1
      this.replyRequestedByMe = false
    } else {
      this.replyRequestCount += 1
      this.replyRequestedByMe = true
    }
    if (this.id) {
      const token = localStorage.getItem("nb.user");
      const headers = { headers: { Authorization: 'Bearer ' + token }}
      axios.post(`/api/annotations/replyRequest/${this.id}`, { replyRequest: this.replyRequestedByMe }, headers)
    }
  }

  /**
   * Toggle the bookmark for this comment by the current user.
   */
  toggleBookmark () {
    this.bookmarked = !this.bookmarked
    if (this.id) {
      const token = localStorage.getItem("nb.user");
      const headers = { headers: { Authorization: 'Bearer ' + token }}
      axios.post(`/api/annotations/bookmark/${this.id}`, { bookmark: this.bookmarked }, headers)
    }
  }

  /**
   * Update the content and settings of this comment and save changes to the backend.
   *
   * @param {Object} data
   * @param {String} data.timestamp - new timestamp, sets {@link NbComment#timestamp}
   * @param {String} data.html - new HTML string of content, sets {@link NbComment#html}
   * @param {Array<String>} data.hashtags - new list of hashtags used, sets {@link NbComment#hashtags}
   * @param {Array<String>} data.people - new list of users tagged, sets {@link NbComment#people}
   * @param {CommentVisibility} data.visibility - new visibility flag, sets {@link NbComment#visibility}
   * @param {CommentAnonymity} data.anonymity - new anonymity flag, sets {@link NbComment#anonymity}
   * @param {Boolean} ddata.replyRequestedByMe - new reply request status by the current user,
   *   sets {@link NbComment#replyRequestedByMe} and {@link NbComment#replyRequestCount}
   */
  saveUpdates (data) {
    this.timestamp = data.timestamp
    this.html = data.html
    this.hashtags = data.mentions.hashtags
    this.people = data.mentions.users
    this.visibility = data.visibility
    this.anonymity = data.anonymity
    if (this.replyRequestedByMe !== data.replyRequested) {
      this.replyRequestedByMe = data.replyRequested
      this.replyRequestCount += data.replyRequested ? 1 : -1
    }
    this.setText()
    const token = localStorage.getItem("nb.user");
    const headers = { headers: { Authorization: 'Bearer ' + token }}
    return axios.put(`/api/annotations/annotation/${this.id}`, {
      content: this.html,
      tags: this.hashtags,
      userTags: this.people,
      visibility: CommentVisibility[this.visibility],
      anonymity: CommentAnonymity[this.anonymity],
      replyRequest: this.replyRequestedByMe
    }, headers)
  }

  /**
   * Remove the reply from this comment.
   * @param {NbComment} child - reply to be removed
   */
  removeChild (child) {
    let idx = this.children.indexOf(child)
    if (idx >= 0) {
      this.children.splice(idx, 1)
      if (child.id) {
        const token = localStorage.getItem("nb.user");
        const headers = { headers: { Authorization: 'Bearer ' + token }}
        axios.delete(`/api/annotations/annotation/${child.id}`, headers)
      }
    }
  }
}

export default NbComment
