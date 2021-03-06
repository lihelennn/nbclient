<template>
  <div class="thread-view">
    <div class="thread-header">
      {{ numComments }}
      &nbsp;·&nbsp;
      <font-awesome-icon icon="question">
      </font-awesome-icon>
      {{ thread.countAllReplyReqs() }}
    </div>
    <thread-comment
        :comment="thread"
        :me="me"
        :replyToComment="replyToComment"
        @edit-comment="editComment"
        @delete-comment="deleteComment"
        @draft-reply="draftReply">
    </thread-comment>
  </div>
</template>

<script>
import ThreadComment from './ThreadComment.vue'

/**
 * Component for the nested discussion view of thread on the side bar.
 * Each thread is represented by the head of thread {@link NbComment}.
 * Also see {@link NbUser}.
 *
 * @vue-prop {NbComment} thread - head of this thread
 * @vue-prop {NbUser} me - current user
 * @vue-prop {NbComment} replyToComment - comment user is currently drafting
 *   a reply for, if any.
 *
 * @vue-computed {String} numComments - label for showing the total number of
 *   comments in this thread
 * @vue-computed {String} numReplyReqs - label for showing the total number of
 *   reply requests in this thread
 *
 * @vue-event {NbComment} edit-comment - Emit the comment to be editted
 *   when user chooses edit option for some comment in this thread
 * @vue-event {NbComment} delete-comment - Emit the comment to be deleted
 *   when user chooses delete option for some comment in this thread
 * @vue-event {NbComment} draft-reply - Emit the comment to reply to
 *   when user clicks on reply button for some comment in this thread
 */
export default {
  name: 'thread-view',
  props: {
    thread: Object,
    me: Object,
    replyToComment: Object
  },
  computed: {
    numComments: function () {
      let count = this.thread.countAllReplies() + 1
      if (count === 1) {
        return '1 comment'
      } else {
        return `${count} comments`
      }
    },
    numReplyReqs: function () {
      let count = this.thread.countAllReplyReqs()
      if (count === 0) {
        return 'no reply requests'
      } else if (count === 1) {
        return '1 reply request'
      } else {
        return `${count} reply requests`
      }
    }
  },
  methods: {
    editComment: function (comment) {
      this.$emit('edit-comment', comment)
    },
    deleteComment: function (comment) {
      this.$emit('delete-comment', comment)
    },
    draftReply: function (comment) {
      this.$emit('draft-reply', comment)
    }
  },
  components: {
    ThreadComment
  }
}
</script>
