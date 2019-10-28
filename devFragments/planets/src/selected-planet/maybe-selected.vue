<template>
  <div>
    <div class="selectedPlanet" v-if='!!selectedPlanet'>
      <selected-planet
        v-bind:selectedPlanet='selectedPlanet'
      >
      </selected-planet>
    </div>
    <div class="selectedPlanet" v-if='!selectedPlanet'>
      No planet selected
    </div>
  </div>
</template>

<script>
import SelectedPlanet from './selected-planet.vue'
export default {
  components: {
    SelectedPlanet
  },
  props: {
    selectedPlanet: Object
  },
}
</script>
