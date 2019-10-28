<template>
  <div>
    <div class='planetAttribute'>
      <div class='attributeTitle'>
        Population
      </div>
      <div class='attribute'>
        {{ selectedPlanet.population | formatPopulation }}
      </div>
    </div>
    <div class='planetAttribute'>
      <div class='attributeTitle'>
        Notable Residents
      </div>
      <div class='attribute'>
        <residents v-bind:residents='selectedPlanet.residents'>
        </residents>
      </div>
    </div>
  </div>
</template>

<script>
import Residents from './residents.vue'
import { abbrNum } from './info-tabs.helper.js'
export default {
  components: {
    Residents,
  },
  filters: {
    formatPopulation: function (value) {
      if(value === undefined) {
        return ''
      } else {
        const parsedValue = parseInt(value)
        if (isNaN(parsedValue)) {
          return value
        } else {
          return abbrNum(value)
        }
      }
    },
  },
  props: {
    selectedPlanet: Object
  },
}
</script>
<style scoped>
.planetAttribute {
  display: flex;
}

.attributeTitle {
  font-weight: bold;
  padding-right: 16px;
  width: 150px;
}
</style>
