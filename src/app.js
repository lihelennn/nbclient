import Vue from 'vue'
import VueQuill from 'vue-quill'
import VTooltip from 'v-tooltip'
import Notifications from 'vue-notification'
import VueSweetalert2 from 'vue-sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';


import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { library } from '@fortawesome/fontawesome-svg-core'
import { fas } from '@fortawesome/free-solid-svg-icons'
import { far } from '@fortawesome/free-regular-svg-icons'
import { faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons'


import { createNbRange, deserializeNbRange } from './models/nbrange.js'
import NbComment from './models/nbcomment.js'
import NbNotification from './models/nbnotification.js'
import { isNodePartOf } from './utils/dom-util.js'
import { compareDomPosition } from './utils/compare-util.js'

import NbHighlights from './components/highlights/NbHighlights.vue'
import NbSidebar from './components/NbSidebar.vue'
import NbNotificationSidebar from './components/NbNotificationSidebar.vue'
import NbNoAccess from './components/NbNoAccess.vue'
import NbLogin from './components/NbLogin.vue'
import axios from 'axios'
import VueJwtDecode from "vue-jwt-decode";


import io from "socket.io-client";
// const socket = io("https://127.0.0.1:3000", {reconnect: true});
const socket = io("https://helen-nb.csail.mit.edu", {reconnect: true});

Vue.use(VueQuill)
Vue.use(VTooltip)
Vue.use(Notifications)
Vue.use(VueSweetalert2);


Vue.component('font-awesome-icon', FontAwesomeIcon)
library.add(fas, far, faChevronDown, faChevronUp)


axios.defaults.baseURL = 'https://nb2.csail.mit.edu/'
// axios.defaults.baseURL = 'https://jumana-nb.csail.mit.edu/'
//axios.defaults.baseURL = 'https://127.0.0.1:3000/' // for local dev only
// axios.defaults.baseURL = 'https://helen-nb.csail.mit.edu/'
// axios.defaults.baseURL = 'https://127.0.0.1:3000/' // for local dev only
axios.defaults.withCredentials = true

export const PLUGIN_HOST_URL = 'https://nb2.csail.mit.edu/client'
// export const PLUGIN_HOST_URL = 'https://jumana-nb.csail.mit.edu/client'
// export const PLUGIN_HOST_URL = 'https://127.0.0.1:3001' // for local dev only
// export const PLUGIN_HOST_URL = 'https://helen-nb.csail.mit.edu/client'
// export const PLUGIN_HOST_URL = 'https://127.0.0.1:3001' // for local dev only

if (
  (document.attachEvent && document.readyState === 'complete') ||
  (!document.attachEvent && document.readyState !== 'loading')
) {
  embedNbApp()
} else {
  document.addEventListener('DOMContentLoaded', embedNbApp)
}

/**
 * Load a CSS stylesheet tag.
 * @param {string} url - Link to the stylesheet
 * @param {HTMLElement} [container = first <head> element] - DOM element to insert the link to
 */
function loadCSS (url, container = document.getElementsByTagName('HEAD')[0]) {
  let tag = document.createElement('link')
  tag.rel = 'stylesheet'
  tag.type = 'text/css'
  tag.href = url
  container.appendChild(tag)
}

/**
 * Load a JS embed tag.
 * @param {string} url - Link to the script
 */
function loadScript (url) {
  let tag = document.createElement('script')
  tag.src = url
  document.getElementsByTagName('HEAD')[0].appendChild(tag)
}

/** Embed NB sidebar. */
function embedNbApp () {
  loadCSS('https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.9.0-alpha1/katex.min.css')
  loadCSS('https://cdn.quilljs.com/1.3.6/quill.snow.css')
  loadCSS(`${PLUGIN_HOST_URL}/style/plugin.css`)
  loadCSS(`${PLUGIN_HOST_URL}/style/tooltip.css`)
  loadScript('https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.9.0-alpha1/katex.min.js')

  // assuming sidebar is 350px wide + 2 * 10px padding + 5px margin
  document.documentElement.setAttribute('style', 'overflow: overlay !important;')
  document.body.setAttribute('style', 'position: initial !important; margin: 0 395px 0 190px !important;')

  let element = document.createElement('div')
  element.id = 'nb-app-wrapper'
  // element.attachShadow({mode: 'open'})

  let child = document.createElement('div')
  child.id = 'nb-app'
  // element.shadowRoot.appendChild(child)
  element.appendChild(child)

  // loadCSS("https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.9.0-alpha1/katex.min.css", element.shadowRoot)
  // loadCSS("https://cdn.quilljs.com/1.3.6/quill.snow.css", element.shadowRoot)
  // loadCSS("http://localhost:8081/src/style/plugin.css", element.shadowRoot)

  document.body.appendChild(element)

  /**
   * User in NB.
   * @typedef {Object} NbUser
   * @property {String} id - user ID
   * @property {String} username - username
   * @property {String} role - role in the current course: null (not enrolled),
   *   'student', or 'instructor'
   * @property {Object} me.name - display names
   * @property {String} me.name.first - first name
   * @property {String} me.name.last - last name
   */

  /**
   * Hashtag in NB.
   * @typedef {Object} NbHashtag
   * @property {String} id - hashtag ID
   * @property {String} value - string labels
   * @property {String} emoji - unicode for emoji label
   */

  let app = new Vue({
    // el: element.shadowRoot.querySelector('#nb-app'),
    el: '#nb-app',
    template: `
      <div id="nb-app" :style="style">
        <div v-if="!user" class="nb-sidebar">
          <nb-login @login="setUser"></nb-login>
        </div>
        <div v-else-if="myClasses.length < 1">
           <nb-no-access :user="user" @logout="onLogout"></nb-no-acess>
        </div>
        <div v-else>
          <notifications position="top left" group="recentlyAddedThreads" />
          <nb-highlights
            :key="resizeKey"
            :threads="filteredThreads"
            :thread-selected="threadSelected"
            :threads-hovered="threadsHovered"
            :draft-range="draftRange"
            :all-class-drafts="allClassDrafts"
            :user-locations="userLocations"
            :show-highlights="showHighlights"
            :show-sync-features="showSyncFeatures"
            @select-thread="onSelectThread"
            @unselect-thread="onUnselectThread"
            @hover-thread="onHoverThread"
            @unhover-thread="onUnhoverThread"
            @new-recent-thread="onNewRecentThread">
          </nb-highlights>
          <nb-notification-sidebar
            :user="user"
            :users="users"
            :online-users="onlineUsers"
            :still-gathering-threads="stillGatheringThreads"
            :threads="filteredThreads"
            :notification-selected="notificationSelected"
            :threads-selected-in-panes="threadsSelectedInPanes"
            :notification-threads="notificationThreads"
            :threads-hovered="threadsHovered"
            :show-highlights="showHighlights"
            :show-sync-features="showSyncFeatures"
            :draggable-notifications-opened="draggableNotificationsOpened"
            :notifications-muted="notificationsMuted"
            @toggle-highlights="onToggleHighlights"
            @select-notification="onSelectNotification"
            @hover-thread="onHoverThread"
            @unhover-thread="onUnhoverThread"
            @toggle-mute-notifications="onToggleMuteNotifications"
            @close-draggable-notications="onCloseDraggableNotifications"
          >
          </nb-notification-sidebar>
          <nb-sidebar
            :user="user"
            :users="users"
            :online-users="onlineUsers"
            :myClasses="myClasses"
            :activeClass="activeClass"
            :hashtags="hashtags"
            :still-gathering-threads="stillGatheringThreads"
            :total-threads="totalThreads"
            :threads="filteredThreads"
            :thread-selected="threadSelected"
            :notification-selected="notificationSelected"
            :threads-selected-in-panes="threadsSelectedInPanes"
            :notification-threads="notificationThreads"
            :threads-hovered="threadsHovered"
            :draft-range="draftRange"
            :show-highlights="showHighlights"
            :source-url="sourceURL"
            :draggable-notifications-opened="draggableNotificationsOpened"
            :notifications-muted="notificationsMuted"
            threadSelectedPane="allThreads"
            :show-sync-features="showSyncFeatures"
            @switch-class="onSwitchClass"
            @show-sync-features="onShowSyncFeatures"
            @toggle-highlights="onToggleHighlights"
            @search-option="onSearchOption"
            @search-text="onSearchText"
            @filter-bookmarks="onFilterBookmarks"
            @filter-hashtags="onFilterHashtags"
            @filter-user-tags="onFilterUserTags"
            @filter-comments="onFilterComments"
            @filter-reply-reqs="onFilterReplyReqs"
            @filter-upvotes="onFilterUpvotes"
            @min-words="onMinWords"
            @max-words="onMaxWords"
            @min-hashtags="onMinHashtags"
            @max-hashtags="onMaxHashtags"
            @min-replies="onMinReplies"
            @min-reply-reqs="onMinReplyReqs"
            @min-upvotes="onMinUpvotes"
            @select-thread="onSelectThread"
            @select-notification="onSelectNotification"
            @hover-thread="onHoverThread"
            @unhover-thread="onUnhoverThread"
            @delete-thread="onDeleteThread"
            @new-thread="onNewThread"
            @cancel-draft="onCancelDraft"
            @editor-empty="onEditorEmpty"
            @thread-typing="onThreadTyping"
            @thread-stop-typing="onThreadStopTyping"
            @prev-comment="onPrevComment"
            @next-comment="onNextComment"
            @toggle-mute-notifications="onToggleMuteNotifications"
            @open-draggable-notifications="onOpenDraggableNotifications"
            @logout="onLogout">
          </nb-sidebar>
        </div>
      </div>
    `,
    data: {
      user: null,
      myClasses:[],
      activeClass: {},
      users: {},
      hashtags: {},
      threads: [],
      threadSelected: null,
      threadsHovered: [], // in case of hover on overlapping highlights
      notificationSelected: null,
      stillGatheringThreads: true,
      draftRange: null,
      isEditorEmpty: true,
      filter: {
        searchOption: 'text',
        searchText: '',
        bookmarks: false,
        hashtags: [],
        userTags: [],
        comments: [],
        replyReqs: [],
        upvotes: [],
        minWords: 0,
        maxWords: null,
        minHashtags: 0,
        maxHashtags: null,
        minReplies: 0,
        minReplyReqs: 0,
        minUpvotes: 0
      },
      showHighlights: true,
      sourceURL: '',
      resizeKey: Date.now(), // work around to force redraw highlights
      allUserDraftLocations: {},
      userLocations: {},
      allClassDrafts: [],
      recentlyAddedThreads: [],
      showSyncFeatures: true,
      onlineUsers: [],
      currentSectionId: "",
      threadsSelectedInPanes: {"allThreads": null, "notifications": null},
      notificationThreads: [],
      swalClicked: false,
      notificationsMuted: false,
      draggableNotificationsOpened: true,
    },
    computed: {
      style: function () {
        return `height: ${document.body.clientHeight}px`
      },
      totalThreads: function () {
        return this.threads.length
      },
      filteredThreads: function () {
        let items = this.threads
        let searchText = this.filter.searchText
        if (searchText.length > 0) {
          if (this.filter.searchOption === 'text') {
            items = items.filter(item => item.hasText(searchText))
          }
          if (this.filter.searchOption === 'author') {
            items = items.filter(item => item.hasAuthor(searchText))
          }
        }
        if (this.filter.bookmarks) {
          items = items.filter(item => item.hasBookmarks())
        }
        let filterHashtags = this.filter.hashtags
        if (filterHashtags.length > 0) {
          items = items.filter(item => {
            for (let hashtag of filterHashtags) {
              if (item.hasHashtag(hashtag)) return true
            }
            return false
          })
        }
        let filterUserTags = this.filter.userTags
        if (filterUserTags.includes('me')) { // single option for now
          items = items.filter(item => item.hasUserTag(this.user.id))
        }
        let filterComments = this.filter.comments
        if (filterComments.length > 0) {
          items = items.filter(item => {
            if (
              filterComments.includes('instructor') && item.hasInstructorPost()
            ) {
              return true
            }
            if (
              filterComments.includes('me') && item.hasUserPost(this.user.id)
            ) {
              return true
            }
            return false
          })
        }
        let filterReplyReqs = this.filter.replyReqs
        if (filterReplyReqs.length > 0) {
          items = items.filter(item => {
            if (
              filterReplyReqs.includes('anyone') && item.hasReplyRequests()
            ) {
              return true
            }
            if (
              filterReplyReqs.includes('me') && item.hasMyReplyRequests()
            ) {
              return true
            }
            return false
          })
        }
        let filterUpvotes = this.filter.upvotes
        if (filterUpvotes.length > 0) {
          items = items.filter(item => {
            if (filterUpvotes.includes('anyone') && item.hasUpvotes()) {
              return true
            }
            if (filterUpvotes.includes('me') && item.hasMyUpvotes()) {
              return true
            }
            return false
          })
        }
        let minWords = this.filter.minWords
        if (minWords > 0) {
          items = items.filter(item => item.wordCount >= minWords)
        }
        let maxWords = this.filter.maxWords
        if (maxWords) {
          items = items.filter(item => item.wordCount <= maxWords)
        }
        let minHashtags = this.filter.minHashtags
        if (minHashtags > 0) {
          items = items.filter(item => item.hashtags.length >= minHashtags)
        }
        let maxHashtags = this.filter.maxHashtags
        if (maxHashtags) {
          items = items.filter(item => item.hashtags.length <= maxHashtags)
        }
        let minReplies = this.filter.minReplies
        if (minReplies > 0) {
          items = items.filter(item => item.countAllReplies() >= minReplies)
        }
        let minReplyReqs = this.filter.minReplyReqs
        if (minReplyReqs > 0) {
          items = items.filter(item => item.countAllReplyReqs() >= minReplyReqs)
        }
        let minUpvotes = this.filter.minUpvotes
        if (minUpvotes > 0) {
          items = items.filter(item => item.countAllUpvotes() >= minUpvotes)
        }
        return items.concat().sort(compareDomPosition) // sort now so we can go prev and next comment
      }
    },
    watch: {
      user: async function (newUser, oldUser) {
        if (!newUser) return // logged out
        if (newUser === oldUser ) return // same user, do nothing

        const source = window.location.origin + window.location.pathname
        const token = localStorage.getItem("nb.user");
        const config = { headers: { Authorization: 'Bearer ' + token }, params: { url: source }}
        const myClasses = await axios.get('/api/annotations/myClasses', config)

        if (myClasses.data.length > 0) {
            this.myClasses = myClasses.data
            
            if (this.myClasses.length === 1) {
                this.activeClass = this.myClasses[0]
            }
            this.sourceURL = source 

        } else {
          const sourceWithQuery = window.location.href // try the source with query params as well
          const configWithQuery = { headers: { Authorization: 'Bearer ' + token }, params: { url: sourceWithQuery }}
          const myClassesWithQuery = await axios.get('/api/annotations/myClasses', configWithQuery)
          if (myClassesWithQuery.data.length > 0) {
            this.myClasses = myClassesWithQuery.data

            if (this.myClasses.length === 1) {
                this.activeClass = this.myClasses[0]
            }
            this.sourceURL = sourceWithQuery

          } else { 
            console.log("Sorry you don't have access");
          } 
        }
      },
      activeClass: async function (newActiveClass, oldActiveClass) {
        if (newActiveClass != {} && this.user) {
            let source = window.location.origin + window.location.pathname
            if (this.sourceURL.length > 0) {
              source = this.sourceURL
            }
            const token = localStorage.getItem("nb.user");
            const config = { headers: { Authorization: 'Bearer ' + token }, params: { url: source, class: newActiveClass.id } }

            axios.get('/api/annotations/allUsers', config)
            .then(res => {
              this.users = res.data
              this.$set(this.user, 'role', this.users[this.user.id].role)
            })
            
            axios.get('/api/annotations/allTagTypes', config)
            .then(res => {
                this.hashtags = res.data
            })

            axios.get('/api/annotations/myCurrentSection', config)
            .then (res => {
              socket.emit('left', {username: this.user.username, classId: oldActiveClass.id, sectionId: this.currentSectionId})
              this.currentSectionId = res.data
              socket.emit('joined', {username: this.user.username, classId: newActiveClass.id, sectionId: this.currentSectionId})
            })
            this.getAllAnnotations(source, newActiveClass) // another axios call put into a helper method

        }

      }
    },
    created: function () {
      const token = localStorage.getItem("nb.user")
      if (token) {
          const decoded = VueJwtDecode.decode(token)
          this.user = decoded.user
      }
      socket.on('connections', (data) => {
        if (data.classId === this.activeClass.id && data.sectionId === this.currentSectionId) {
          console.log(data.connections)
          let onlineUsersSet = new Set(data.connections)
          this.onlineUsers = [...onlineUsersSet]
        }
      })
      socket.on("new_thread", (data) => {
        console.log(this.users[data.authorId])
        console.log(this.users[data.authorId].role==="instructor")
        let userIdsSet = new Set(data.userIds)
        console.log(data)
        if (data.authorId !== this.user.id && userIdsSet.has(this.user.id)) { // find if we are one of the target audiences w/ visibility + section permissions for this new_thread if current user, we already added new thread to their list
          let classId = data.classId
          if (this.activeClass) { // originally had a check here to see if currently signed in, then don't retrieve again
            if (this.activeClass.id == classId && this.sourceURL === data.sourceUrl) {
              this.getSingleThread(data.sourceUrl, classId, data.threadId, data.authorId, data.taggedUsers, true) // data contains info about the thread and if the new thread as posted by an instructor
              console.log("new thread: gathered new annotations")
            }
          }
        }
      })
      socket.on('thread-typing', (data) => {
        let thread = this.threads.find(x => x.id === data.threadId)
        if (thread !== undefined) {
          thread.usersTyping = data.usersTyping
        }
      });

      socket.on('new_reply', (data) => {
        console.log(this.users[data.authorId])
        console.log(this.users[data.authorId].role==="instructor")
        console.log(data)
        if (data.authorId !== this.user.id) { // if current user, we already added new reply to their list
          let classId = data.classId
          if (this.activeClass) { // originally had a check here to see if currently signed in, then don't retrieve again
            if (this.activeClass.id == classId && this.sourceURL === data.sourceUrl) {
              this.threads = this.threads.filter(x => x.id !== data.headAnnotationId) // filter out the thread
              this.getSingleThread(data.sourceUrl, classId, data.threadId, data.authorId, data.taggedUsers, false) // data contains info about the thread and if the new thread as posted by an instructor
              console.log("new thread: gathered new replies")
            }
          }
        }
      })

      // socket.on('new-draft', (data) => {
      //   if (data.classId === this.activeClass.id) { //TODO: check to make sure another user
      //     if (data.range === null) {
      //       delete this.allUserDraftLocations[data.username]
      //     } else {
      //       this.allUserDraftLocations[data.username] = deserializeNbRange(data.range)
      //       // console.log(Object.values(this.allUserDraftLocations))
      //       // console.log(this.allUserDraftLocations)
      //       // for (const [key, value] of Object.entries(this.allUserDraftLocations)) {
      //       //   console.log(`${key}: ${value}`);
      //       // }
      //       // console.log(Object.entries(this.allUserDraftLocations))
      //       // console.log(this.allClassDrafts)
      //       this.allClassDrafts = Object.values(this.allUserDraftLocations)
      //     }
      //   }
      // })

      // socket.on('user-location', (userLocations) => {
      //   console.log(userLocations)
      //   let userLocationsParsed  = JSON.parse(userLocations)
      //   console.log(userLocationsParsed)
      //   const usernames = Object.keys(userLocationsParsed)
      //   let newUserLocations = []
      //   for (const username of usernames) {
      //     let userLocation = userLocationsParsed[username]["location"]
      //     let userTextSize = userLocationsParsed[username]["dimensions"]
      //     let currentWidth = document.querySelector('.nb-highlights').clientWidth
      //     let currentHeight = document.querySelector('.nb-highlights').clientHeight
      //     let newX = userLocation[0] * (currentWidth / userTextSize[0])
      //     let newY = userLocation[1] * (currentHeight / userTextSize[1])

      //     // this.userLocations[username] = [newX, newY]
      //     newUserLocations.push([newX, newY])
      //   }
      //   this.userLocations = newUserLocations
      //   console.log(this.userLocations)
      // })

      // socket.on('new-thread', (data) => {
      //   if (data.class.id === this.activeClass.id) {
      //     console.log("found new thread for this class!")
      //     console.log(data.thread)
      //     this.threads.push(data.thread)
      //   }
      // });
    },
    methods: {
      setUser: function (user) {
        this.user = user
      },
      logUserLocation: function(x, y, docWidth, docHeight) {
        // socket.emit('user-location', {x: x, y: y, docWidth: docWidth, docHeight: docHeight, username: this.user.username})
      },
      recalculateUserLocations: function() {
        // recalculate upon resize
      },
      onUserLeft: function() {
        socket.emit('left', {username: this.user.username, classId: this.activeClass.id, sectionId: this.currentSectionId})
      },
      addSomeAnnotationsBy300(headAnnotations, annotationsData, idx, timer) {
        let newIdx = idx
        console.log(newIdx)
        while (newIdx < headAnnotations.length && newIdx - idx < 300) { // while still elements in list and we haven't gotten through 10 yet
          let item = headAnnotations[newIdx]
          try {
            item.range = deserializeNbRange(item.range)
          } catch (e) {
            console.warn(`Could not deserialize range for ${item.id}`)
            continue 
          }
          // Nb Comment
          let comment = new NbComment(item, annotationsData)

          this.threads.push(comment)
           newIdx+=1
        }
        // clearTimeout(timer) // clear any timers that may exist right now
        if (newIdx < headAnnotations.length) {
          console.log("Going to get more soon")
          timer = setTimeout(() => {
            console.log("GETTING MORE!")
            this.addSomeAnnotationsBy300(headAnnotations, annotationsData, newIdx, timer)
          }, 5000) 
        }
        
       
      },
      getSingleThread: function (sourceUrl, classId, threadId, authorId, taggedUsers, isNewThread) { // get single thread and add it to the list
        const token = localStorage.getItem("nb.user");
        const config = { headers: { Authorization: 'Bearer ' + token }, params: { source_url: sourceUrl, class_id: classId, thread_id:  threadId} }
        axios.get('/api/annotations/specific_thread',  config)
        .then(res => {
          console.log(res.data)
          let item = res.data.headAnnotation
          try {
            item.range = deserializeNbRange(item.range)
          } catch (e) {
            console.warn(`Could not deserialize range for ${item.id}`)
          }
          // Nb Comment
          let comment = new NbComment(item, res.data.annotationsData)
          
          console.log(this.users[authorId])
          console.log(taggedUsers)
          console.log(comment.getAllAuthors())
          var notification = null
          if (taggedUsers.includes(this.user.id)) {
            notification = new NbNotification("You have been tagged in a comment", comment, true)
          } else if (this.users[authorId].role === "instructor") {
            if (isNewThread) {
              notification = new NbNotification("An instructor posted a new thread", comment, false)
            } else {
              if (comment.getAllAuthors().has(this.user.id)) {
                notification = new NbNotification("An instructor commented in a thread you're in", comment, false)
              }
            }
          } else if (isNewThread && comment.hasReplyRequests()) {
            notification = new NbNotification("A classmate needs a reply request", comment, false)
          } else if (comment.hasMyReplyRequests()) {
            notification = new NbNotification("Someone may have responded to your reply request", comment, true)
          }
          if (notification !== null) {
            this.notificationThreads.push(notification)
            comment.associatedNotification = notification 
            this.triggerPopupNotification(notification)
          }
          this.threads.push(comment)
        })
      },
      triggerPopupNotification: function (notification) {
        console.log(this.notificationsMuted)
        if (notification.triggerPopup && !this.notificationsMuted) {
          this.$swal({
            title: '',
            text: notification.title,
            type: 'success',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Bring me there!',
            toast: true,
            position: 'top-start'
          }).then((result) => {
            if (result.value) {
              this.swalClicked = true 
              notification.setIsUnseen(false)
              this.onSelectNotification(notification)
            }
          }) 
        }
      },
      newNotification: function (comment) {
        if (this.notificationThreads.length < 5) { // limit to 5 initial notifications
          if (comment.isUnseen()) {
            if (comment.hasUserTag(this.user.id)) {
              return new NbNotification("You have an unseen thread that you're tagged in", comment, true)
            }
            if (comment.hasMyReplyRequests()) {
              return new NbNotification("You have an unseen comment in a thread that you requested replies for", comment, true)
            }
            if (comment.hasInstructorPost()) {
              return new NbNotification("You have an unseen thread with an instructor comment", comment, false)
            }
          }
        }
        return null
      },
      getAllAnnotations: function (source, newActiveClass) {
        this.stillGatheringThreads = true
        const token = localStorage.getItem("nb.user");
        const config = { headers: { Authorization: 'Bearer ' + token }, params: { url: source, class: newActiveClass.id } }
        axios.get('/api/annotations/new_annotation',  config)
        .then(res => {
            this.threads = []
            for (const item of res.data.headAnnotations) {
              try {
                item.range = deserializeNbRange(item.range)
              } catch (e) {
                console.warn(`Could not deserialize range for ${item.id}`)
                continue 
              }
              // Nb Comment
              let comment = new NbComment(item, res.data.annotationsData)
              this.threads.push(comment)

              let newNotification = this.newNotification(comment) // Either get back a notification to add or null
              if (newNotification !== null) {
                this.notificationThreads.push(newNotification)
                comment.associatedNotification = newNotification 
              }
            }
            this.stillGatheringThreads = false
            let link = window.location.hash.match(/^#nb-comment-(.+$)/)
            if (link) {
                let id = link[1]
                this.threadSelected = this.threads.find(x => x.id === id)
            }
        })
      },
      draftThread: function (range) {
        if (this.user) { // only if selection was after user log in
          // let prevDraftRange = this.draftRange.serialize()
          this.draftRange = createNbRange(range)
          // console.log(range)
          // socket.emit('new-draft', {range: this.draftRange.serialize(), classId: this.activeClass.id, username: this.user.username})
        }
      },
      onDeleteThread: function (thread) {
        if (this.threadSelected === thread) { this.threadSelected = null }
        let idx = this.threads.indexOf(thread)
        if (idx >= 0) { this.threads.splice(idx, 1) }
        if (thread.id) {
          const token = localStorage.getItem("nb.user");
          const headers = { headers: { Authorization: 'Bearer ' + token }}
          axios.delete(`/api/annotations/annotation/${thread.id}`, headers)
        }
      },
      onNewThread: function (thread) {
        this.threads.push(thread)
        this.draftRange = null
        // socket.emit('new-thread', {thread: thread, class: this.activeClass})
      },
      onCancelDraft: function () {
        this.draftRange = null
        // socket.emit('new-draft', {range: null, classId: this.activeClass.id, username: this.user.username})
      },
      onEditorEmpty: function (isEmpty) {
        this.isEditorEmpty = isEmpty
      },
      onSearchOption: function (option) {
        this.filter.searchOption = option
        this.onSearchUpdate()
      },
      onSearchText: function (text) {
        this.filter.searchText = text
        this.onSearchUpdate()
      },
      onSearchUpdate: function () {
        if (this.threadSelected && this.filter.searchText.length > 0) {
          if (
            this.filter.searchOption === 'text' &&
            !this.threadSelected.hasText(this.filter.searchText)
          ) {
            this.threadSelected = null // reset selection if filtered
          }
          if (
            this.filter.searchOption === 'author' &&
            !this.threadSelected.hasAuthor(this.filter.searchText)
          ) {
            this.threadSelected = null // reset selection if filtered
          }
        }
      },
      onFilterBookmarks: function (filter) {
        if (
          this.threadSelected &&
          filter &&
          !this.threadSelected.hasBookmarks()
        ) {
          this.threadSelected = null // reset selection if filtered
        }
        this.filter.bookmarks = filter
      },
      onFilterHashtags: function (hashtags) {
        if (this.threadSelected && hashtags.length > 0) {
          let filtered = true
          for (let hashtag of hashtags) {
            if (this.threadSelected.hasHashtag(hashtag)) {
              filtered = false
              break
            }
          }
          if (filtered) {
            this.threadSelected = null // reset selection if filtered
          }
        }
        this.filter.hashtags = hashtags
      },
      onFilterUserTags: function (filters) {
        if (
          this.threadSelected &&
          filters.includes('me') && // single option for now
          !this.threadSelected.hasUserTag(this.user.id)
        ) {
          this.threadSelected = null // reset selection if filtered
        }
        this.filter.userTags = filters
      },
      onFilterComments: function (filters) {
        if (this.threadSelected && filters.length > 0) {
          let filtered = true
          if (
            filters.includes('instructor') &&
            this.threadSelected.hasInstructorPost()
          ) {
            filtered = false
          }
          if (
            filters.includes('me') &&
            this.threadSelected.hasUserPost(this.user.id)
          ) {
            filtered = false
          }
          if (filtered) {
            this.threadSelected = null // reset selection if filtered
          }
        }
        this.filter.comments = filters
      },
      onFilterReplyReqs: function (filters) {
        if (this.threadSelected && filters.length > 0) {
          let filtered = true
          if (
            filters.includes('anyone') &&
            this.threadSelected.hasReplyRequests()
          ) {
            filtered = false
          }
          if (
            filters.includes('me') &&
            this.threadSelected.hasMyReplyRequests()
          ) {
            filtered = false
          }
          if (filtered) {
            this.threadSelected = null // reset selection if filtered
          }
        }
        this.filter.replyReqs = filters
      },
      onFilterUpvotes: function (filters) {
        if (this.threadSelected && filters.length > 0) {
          let filtered = true
          if (filters.includes('anyone') && this.threadSelected.hasUpvotes()) {
            filtered = false
          }
          if (filters.includes('me') && this.threadSelected.hasMyUpvotes()) {
            filtered = false
          }
          if (filtered) {
            this.threadSelected = null // reset selection if filtered
          }
        }
        this.filter.upvotes = filters
      },
      onMinWords: function (min) {
        if (this.threadSelected && this.threadSelected.wordCount < min) {
          this.threadSelected = null // reset selection if filtered
        }
        this.filter.minWords = min
      },
      onMaxWords: function (max) {
        if (this.threadSelected && this.threadSelected.wordCount > max) {
          this.threadSelected = null // reset selection if filtered
        }
        this.filter.maxWords = max
      },
      onMinHashtags: function (min) {
        if (this.threadSelected && this.threadSelected.hashtags.length < min) {
          this.threadSelected = null // reset selection if filtered
        }
        this.filter.minHashtags = min
      },
      onMaxHashtags: function (max) {
        if (this.threadSelected && this.threadSelected.hashtags.length > max) {
          this.threadSelected = null // reset selection if filtered
        }
        this.filter.maxHashtags = max
      },
      onMinReplies: function (min) {
        if (
          this.threadSelected &&
          this.threadSelected.countAllReplies() < min
        ) {
          this.threadSelected = null // reset selection if filtered
        }
        this.filter.minReplies = min
      },
      onMinReplyReqs: function (min) {
        if (
          this.threadSelected &&
          this.threadSelected.countAllReplyReqs() < min
        ) {
          this.threadSelected = null // reset selection if filtered
        }
        this.filter.minReplyReqs = min
      },
      onMinUpvotes: function (min) {
        if (
          this.threadSelected &&
          this.threadSelected.countAllUpvotes() < min
        ) {
          this.threadSelected = null // reset selection if filtered
        }
        this.filter.minUpvotes = min
      },
      onSelectThread: function (thread) {
        this.threadSelected = thread
        this.threadsSelectedInPanes["allThreads"] = thread
        thread.markSeenAll()
      },
      onSelectNotification: function (notification) {
        this.notificationSelected = notification
        this.threadSelected = notification.comment 
        this.threadsSelectedInPanes["notifications"] = notification.comment
        notification.comment.markSeenAll()
      },
      onUnselectThread: function (thread) {
        if (this.swalClicked) {
          console.log(this.threadSelected)
          console.log(this.threadsSelectedInPanes["notification"])
          this.swalClicked = false // don't unselect if this was a popup notification click
        } else { // otherwise, it was a valid unselect thread click
          this.threadSelected = null
          console.log("hi")
          if (this.draftRange && this.isEditorEmpty) {
            this.onCancelDraft()
          }
        }
      },
      onHoverThread: function (thread) {
        if (!this.threadsHovered.includes(thread)) {
          this.threadsHovered.push(thread)
        }
      },
      onUnhoverThread: function (thread) {
        let idx = this.threadsHovered.indexOf(thread)
        if (idx >= 0) this.threadsHovered.splice(idx, 1)
      },
      onNewRecentThread: function (thread) {
        // console.log(thread)
        if (thread.author !== this.user.id && thread.associatedNotification === null) { // if not this author and no notifications for this thread yet
          let notification = new NbNotification("A recent thread near you has been posted", thread, false)
          this.notificationThreads.push(notification)
          thread.associatedNotification = notification
          console.log("setting associated notif on recent thread")
        }
      },
      onToggleHighlights: function (show) {
        this.showHighlights = show
      },
      handleResize: function () {
        this.resizeKey = Date.now()
      },
      onSwitchClass: function(newClass) {
        this.activeClass = newClass
      },
      onShowSyncFeatures: function(showSyncFeatures) {
        this.showSyncFeatures = showSyncFeatures
      },
      onThreadTyping: function(threadId) {
        if (threadId) {
          socket.emit('thread-typing', {threadId: threadId, username: this.user.username})
        }
      },
      onThreadStopTyping: function(threadId) {
        if (threadId) {
          socket.emit('thread-stop-typing', {threadId: threadId, username: this.user.username})
        }
      },
      onPrevComment: function () {
        let idx = this.filteredThreads.findIndex(x => x.id === this.threadSelected.id)
        let prevIdx = idx-1
        if (prevIdx >= 0 && prevIdx < this.filteredThreads.length) {
          this.onSelectThread(this.filteredThreads[prevIdx])
        }
      },
      onNextComment: function () {
        let idx = this.filteredThreads.findIndex(x => x.id === this.threadSelected.id)
        let nextIdx = idx+1
        if (nextIdx >= 0 && nextIdx < this.filteredThreads.length) {
          this.onSelectThread(this.filteredThreads[nextIdx])
        }
      },
      onToggleMuteNotifications: function () {
        this.notificationsMuted = !this.notificationsMuted
      },
      onCloseDraggableNotifications: function () {
        this.draggableNotificationsOpened = false;
      },
      onOpenDraggableNotifications: function () {
        this.draggableNotificationsOpened = true;
      },
      onLogout: function () {
          localStorage.removeItem("nb.user")
          this.user = null
          this.myClasses = []
          this.activeClass = {}
          this.users = {}
          this.hashtags = {}
          this.threads = []
          this.threadSelected = null
          this.threadsHovered = []
          this.draftRange = null
          this.isEditorEmpty = true
          this.filter = {
            searchOption: 'text',
            searchText: '',
            bookmarks: false,
            hashtags: [],
            userTags: [],
            comments: [],
            replyReqs: [],
            upvotes: [],
            minWords: 0,
            maxWords: null,
            minHashtags: 0,
            maxHashtags: null,
            minReplies: 0,
            minReplyReqs: 0,
            minUpvotes: 0
          }
          this.showHighlights = true
          this.onUserLeft()
      }
    },
    components: {
      NbHighlights,
      NbSidebar,
      NbLogin,
      NbNoAccess,
      NbNotificationSidebar
    }
  })

  document.body.addEventListener('mouseup', _ => {
    let selection = window.getSelection()
    if (selection.isCollapsed) { return }

    let sidebar = document.querySelector('#nb-app-wrapper')
    let range = selection.getRangeAt(0)
    if ( // check selection does not overlap sidebar
      !isNodePartOf(range.startContainer, sidebar) &&
      !isNodePartOf(range.endContainer, sidebar)
    ) {
      app.draftThread(range)
      // Selection will be removed in highlight-util.eventsProxyMouse
      // because 'click' is triggered after 'mouseup'
    }
  })

  // document.body.addEventListener('mousedown', e => {
  //   // console.log(e.pageX)
  //   // console.log(e.pageY)
  //   console.log(e)
  //   let width = document.querySelector('.nb-highlights').clientWidth
  //   let height = document.querySelector('.nb-highlights').clientHeight

  //   // let offsetX = window.pageXOffset ||
  //   //   document.documentElement.scrollLeft ||
  //   //   document.body.scrollLeft || 0
  //   // let offsetY = window.pageYOffset ||
  //   //   document.documentElement.scrollTop ||
  //   //   document.body.scrollTop || 0
  //   // var relX = e.pageX - offsetX
  //   // var relY = e.pageY - offsetY
  //   // console.log(relY)
  //   // console.log(relY)
  //   app.logUserLocation(e.pageX, e.pageY, width, height)
  //   // let zoomLevel = windowgetComputedStyle(documnet.body)

  // })

  document.addEventListener('keyup', e => {
    if (e.key === 'Escape') {
      app.onUnselectThread()
    }
  })
  
  window.addEventListener('resize', e => {
    app.handleResize()
  })

  window.onbeforeunload = () => {
    console.log("unloading and exiting page")
    app.onUserLeft()
  }
}
