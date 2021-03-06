<template>
  <div class="list-view">
    <div class="list-header">
      <span class="count">
        {{ threads.length }} of {{ totalLabel }}
      </span>
      <span
          class="toggle-highlights"
          v-tooltip="showHighlights ? 'hide highlights' : 'show highlights'"
          @click="toggleHighlights">
        <font-awesome-icon v-if="showHighlights" icon="eye" class="icon">
        </font-awesome-icon>
        <font-awesome-icon v-else icon="eye-slash" class="icon">
        </font-awesome-icon>
      </span>
      <span class="sort">
        Sort by:
        <select v-model="sortBy">
          <option v-for="option in sortByOptions" :key="option.value"
              :value="option.value">
            {{ option.text }}
          </option>
        </select>
      </span>
    </div>
    <div class="list-table">
      <list-row
          v-for="thread in sorted"
          :key="thread"
          :thread="thread"
          :thread-selected="threadSelected"
          :threads-hovered="threadsHovered"
          @select-thread="$emit('select-thread', thread)"
          @hover-thread="$emit('hover-thread', thread)"
          @unhover-thread="$emit('unhover-thread', thread)">
      </list-row>
    </div>
  </div>
</template>

<script>
import ListRow from './ListRow.vue'
import { compare, compareDomPosition } from '../../utils/compare-util.js'

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
 * @vue-data {String} sortBy='position' - current sorting option value
 * @vue-data {Array<Object>} sortByOptions - all sorting options, each option
 *   is an object with two string props, text (for labels) and value
 *
 * @vue-computed {String} totalLabel - display label for number of all threads
 * @vue-computed {Array<NbComment>} sorted - all visible threads ordered by
 *   the current sorting option
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
  name: 'list-view',
  props: {
    threads: {
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
    }
  },
  data () {
    return {
      sortBy: 'position',
      sortByOptions: [
        { text: 'Default', value: 'position' },
        { text: 'Most Recent', value: 'recent' },
        { text: 'Longest Thread', value: 'comment' },
        { text: 'Reply Requests', value: 'reply_request' },
        { text: 'Upvotes', value: 'upvote' }
      ]
    }
  },
  computed: {
    totalLabel: function () {
      if (this.totalCount === 1) {
        return '1 thread'
      } else {
        return `${this.totalCount} threads`
      }
    },
    sorted: function () {
      switch (this.sortBy) {
        case 'position':
          return this.threads.concat().sort(compareDomPosition)
        case 'recent':
          return this.threads.concat().sort(compare('timestamp', 'key', false))
        case 'comment':
          return this.threads.concat().sort(compare('countAllReplies', 'func', false))
        case 'reply_request':
          return this.threads.concat().sort(compare('countAllReplyReqs', 'func', false))
        case 'upvote':
          return this.threads.concat().sort(compare('countAllUpvotes', 'func', false))
        default:
          return this.threads
      }
    }
  },
  methods: {
    toggleHighlights: function () {
      this.$emit('toggle-highlights', !this.showHighlights)
    }
  },
  components: {
    ListRow
  }
}
</script>
