<template>
  <div id="nb-notification-sidebar" class="nb-notification-sidebar" :style="style">
    <notification-sidebar-view
        v-if="!isCollapsed"
        :notifications="notificationThreads"
        :total-count="notificationThreads.length"
        :thread-selected="threadsSelectedInPanes['notifications']"
        :notification-selected="notificationSelected"
        :threads-hovered="threadsHovered"
        :show-highlights="showHighlights"
        @toggle-highlights="onToggleHighlights"
        @select-notification="onSelectNotification"
        @hover-thread="onHoverThread"
        @unhover-thread="onUnhoverThread"
        @notifications-muted="onNotificationsMuted"
    >
    </notification-sidebar-view>
    <div @click="onCollapseNotifications" class="outer" v-if='false'>
        <div class="inner rotate">
            <span class="card-header-title">{{title}} ({{numberUnseen}} unread)
              <a class="button card-header-icon collapse-button">
                <font-awesome-icon icon="chevron-up" v-if="!isCollapsed"/>
                <font-awesome-icon icon="chevron-down" v-if="isCollapsed"/>
              </a>
            </span>
        </div>
    </div>
  </div>
</template>

<script>
import NotificationSidebarView from './list/NotificationSidebarView.vue'

export default {
  name: 'nb-notification-sidebar',
  props: {
    user: {
      type: Object,
      default: () => {}
    },
    users: {
      type: Object,
      default: () => {}
    },
    onlineUsers: {
      type: Array,
      default: () => []
    },
    stillGatheringThreads: {
      type: Boolean,
      default: true
    },
    showHighlights: {
      type: Boolean,
      default: true
    },
    threadsHovered: {
      type: Array,
      default: () => []
    },
    threadSelected: Object,
    notificationSelected: Object,
    threadsSelectedInPanes: {
      type: Object,
      default: () => {}
    },
    notificationThreads: {
      type: Array,
      default: () => []
    },
    showSyncFeatures: {
      type: Boolean,
      default: true
    },
  },
  data () {
    return {
      isCollapsed: false,
      notificationsMuted: false,
    }
  },
  computed: {
    totalLabel: function () {
      if (this.totalCount === 1) {
        return '1 total notification'
      } else {
        return `${this.notificationThreads.length} total notifications`
      }
    },
    title: function () {
      return 'Notifications'
    },
    numberUnseen: function () {
        return this.notificationThreads.filter(n => n.unseen).length
    },
    style: function () {
      if (this.isCollapsed) {
        return 'width: 20px;'
      }
    }
  },
  methods: {
    onCollapseNotifications: function() {
      this.isCollapsed = !this.isCollapsed
      if (this.isCollapsed) {
        document.body.setAttribute('style', 'position: initial !important; margin: 0 395px 20px 0 !important;')
      } else {
        document.body.setAttribute('style', 'position: initial !important; margin: 0 395px 0 190px !important;')
      }

    },
    onToggleHighlights: function (show) {
      this.$emit('toggle-highlights', show)
    },
    onSelectNotification: function (notification) {
      this.$emit('select-notification', notification)
    },
    onHoverThread: function (thread) {
      this.$emit('hover-thread', thread)
    },
    onUnhoverThread: function (thread) {
      this.$emit('unhover-thread', thread)
    },
    onNotificationsMuted: function (muted) {
      this.$emit('notifications-muted', muted)
    }
  },
  components: {
    NotificationSidebarView,
  }
}
</script>
