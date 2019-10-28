<template>
  <router-link
    class="planet"
    :to="`/planets/${planet.id}/attributes`"
  >
    {{planet.name}}
  </router-link>
</template>

<script>
export default {
  props: {
    planet: Object
  },
}
</script>

<style scoped>
.planet {
  height: 50px;
  display: flex;
  align-items: center;
  border-bottom: 1px solid var(--white);
  cursor: pointer;
  text-decoration: none;
  color: var(--white);
}

.planet:last-child {
  border-bottom: none;
}

.planet:first-child {
  border-top: 1px solid var(--white);
}
</style>
