<template>
  <div class='header'>
    {{selectedPlanet.name}}
  </div>
</template>

<script>
export default {
  props: {
    selectedPlanet: Object
  }
}
</script>

<style scoped>
.header {
  font-size: 32px;
}
</style>
