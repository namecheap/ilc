<template>
  <div>
    <div class='planetAttribute'>
      <div class='attributeTitle'>
        Climate
      </div>
      <div class='attribute'>
        {{selectedPlanet.climate}}
      </div>
    </div>
    <div class='planetAttribute'>
      <div class='attributeTitle'>
        Diameter
      </div>
      <div class='attribute'>
        {{ selectedPlanet.diameter | formatDiameter }}
      </div>
    </div>
    <div class='planetAttribute'>
      <div class='attributeTitle'>
        Gravity
      </div>
      <div class='attribute'>
        {{selectedPlanet.gravity}}
      </div>
    </div>
    <div class='planetAttribute'>
      <div class='attributeTitle'>
        Terrain
      </div>
      <div class='attribute'>
        {{selectedPlanet.terrain}}
      </div>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    selectedPlanet: Object
  },
  filters: {
    formatDiameter: function (value) {
      if (value === undefined) {
        return ''
      } else {
        const parsedValue = parseInt(value)
        if (isNaN(parsedValue)) {
          return value
        } else {
          return `${value} Kilometers (${value * 0.621371} Miles)`
        }
      }
    }
  }
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
