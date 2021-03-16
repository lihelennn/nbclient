<template>
  <div class="list-view">
    <header class="card-header"
      v-tooltip="tooltipType"
      @click="isCollapsed = !isCollapsed">
      <p class="card-header-title">{{title}} ({{numberUnseen}} unread)</p>
      <a class="button card-header-icon collapse-button">
        <font-awesome-icon icon="chevron-up" v-if="!isCollapsed"/>
        <font-awesome-icon icon="chevron-down" v-if="isCollapsed"/>
      </a>
    </header>
    <div v-if="!isCollapsed">
      <div class="list-header">
        <span class="count">
          {{ totalLabel }}
        </span>
        <span class="configure">
          <a href="https://localhost:8080">Configure</a>
        </span>
      </div>
      <div class="list-table">
        <notification-row
            v-for="(notification,index) in notifications" 
            :notification="notifications[notifications.length-1-index]"
            :key="notifications[notifications.length-1-index]"
            :thread-selected="threadSelected"
            :threads-hovered="threadsHovered"
            @select-interesting-thread="onSelectInterestingThread"
            @hover-thread="onHoverNotification"
            @unhover-thread="onUnhoverNotification">
        </notification-row>
      </div>
    </div>
  </div>
</template>

<script>
import NotificationRow from './NotificationRow.vue'

/**
 * Component for the list of threads on the side bar.
 * Each thread is represented by the head of thread {@link NbComment}.
 *
 * @vue-prop {Array<NbComment>} threads=([]) - all visible threads
 * @vue-prop {Number} totalCount=0 - number of all threads (visible and hidden)
 * @vue-prop {NbComment} threadSelected - currently selected thread
 * @vue-prop {Array<NbComment>} threadsHovered=([]) - currently hovered threads
 * @vue-prop {Boolean} showHighlights=true - true if highlights are overlayed
 *   on text, false if collapsed to the side
 *
 * @vue-computed {String} totalLabel - display label for number of all threads
 *
 * @vue-event {NbComment} select-thread - Emit currently selected thread
 *   when user selects a thread by clicking on the list row
 * @vue-event {NbComment} hover-thread - Emit the hovered thread
 *   when user starts hovering over the list row
 * @vue-event {NbComment} unhover-thread - Emit the unhovered thread
 *   when user stops hovering over the list row
 * @vue-event {Boolean} toggle-highlights - Emit the new highlight visibility
 *   upon change, true to show, false to collapse
 */
export default {
  name: 'notification-view',
  props: {
    notifications: {
      type: Array,
      default: () => []
    },
    totalCount: { // number of total threads before filter
      type: Number,
      default: 0
    },
    threadSelected: Object,
    threadsHovered: {
      type: Array,
      default: () => []
    },
    showHighlights: {
      type: Boolean,
      default: true
    },
  },
  data () {
    return {
      isCollapsed: true,
    }
  },
  computed: {
    totalLabel: function () {
      if (this.totalCount === 1) {
        return '1 total notification'
      } else {
        return `${this.totalCount} total notifications`
      }
    },
    tooltipType: function () {
    return 'See some help-need threads, pins, reply requests, and threads happening nearby you.'
      
    },
    title: function () {
      return 'Notifications'
    },
    numberUnseen: function () {
        return this.notifications.filter(n => n.unseen).length
    }
  },
  methods: {
    toggleHighlights: function () {
      this.$emit('toggle-highlights', !this.showHighlights)
    },
    onSelectInterestingThread: function (thread) {
        this.$emit('select-interesting-thread', thread)
    },
    onHoverNotification: function (thread) {
        this.$emit('hover-thread', thread)   
    },
    onUnhoverNotification: function (thread) {
        this.$emit('unhover-thread', thread)
    }
  },
  components: {
    NotificationRow
  }
}
</script>
