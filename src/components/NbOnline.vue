<template>
  <div 
    class="nb-sync"
    :style="style"
  >
    <div>
      <label>Show Sync Features</label>
      <input type="checkbox"
          v-model="showSyncFeatures"
          :true-value="true"
          :false-value="false"
          @change="onShowSyncFeaturesChange($event)"
      >
    </div>
    <div class="nb-online" v-if="showSyncFeatures">
      <label>Users Online: {{numOnlineUsers}}</label>
      <!-- <avatar 
        v-for="user in onlineUsers"
        :key="user"
        :fullname="user"/> -->
    </div>
  </div>
</template>

<script>

/**
 * Component for showing who is online overlays corresponding to threads.
 */
import Avatar from 'vue-avatar-component'

export default {
  name: 'nb-online',
  props: {
    onlineUsers: {
      type: Array,
      default: () => []
    },
    showSyncFeatures: {
      type: Boolean,
      default: true
    },
    nbMenuShowing: {
      type: Boolean,
      default: false
    }
  },
  computed: {
    numOnlineUsers: function() {
      return this.onlineUsers.length
    },
    style: function() {
      return this.nbMenuShowing ? "margin-top: 5px" : "margin-top: 2.5em"
    }
  },
  methods: {
    onShowSyncFeaturesChange: function(event) {
        this.$emit('show-sync-features', this.showSyncFeatures)
    }
  },
  mounted: function () {
  },
  components: {
    Avatar
  }
}
</script>
