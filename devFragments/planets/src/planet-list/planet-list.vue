<template>
  <div class="planetList">
    <button
      @click='handleButtonClick'
      :disabled='loading || !nextPage'
      class='brand-button margin-bottom-16'
    >
      Fetch More planets
    </button>
    <div v-for='planet in planets'>
      <planet
        v-bind:planet='planet'
      >
      </planet>
    </div>
    <div v-if='loading'>
      Loading ...
    </div>
  </div>
</template>

<script>
import Planet from './planet.vue'
export default {
  props: {
    loading: Boolean,
    nextPage: Boolean,
    planets: Array,
  },
  components: {
    Planet
  },
  methods: {
    handleButtonClick: function () {
      this.$emit('fetchPlanets')
    }
  }
}
</script>
