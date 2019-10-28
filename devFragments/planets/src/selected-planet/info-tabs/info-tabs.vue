<template>
  <div>
    <div class='tabs'>
      <router-link
        class='tabLink'
        active-class='active'
        :to="{name: 'attributes', params: {selectedPlanet:selectedPlanet}}"
        >
        <div>
          Attributes
        </div>
      </router-link>
      <router-link
        class='tabLink'
        active-class='active'
        :to="{name: 'people', params: {selectedPlanet:selectedPlanet}}"
        >
        <div>
          People
        </div>
      </router-link>
      <router-link
        class='tabLink'
        active-class='active'
        :to="{name: 'todo'}"
        >
        <div>
          Todo
        </div>
      </router-link>
    </div>
    <div class='infoBlock'>
      <router-view :selectedPlanet='selectedPlanet'>
      </router-view>
    </div>
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
.tabs {
  display: flex;
  font-size: 32px;
}
.tabLink {
  padding: 4px 8px;
  text-decoration: none;
  color: var(--white);
  border: 1px solid var(--white);
  border-radius: 8px 8px 0px 0px;
  border-bottom: none;
}
.tabLink.active {
  background-color: var(--white);
  color: var(--background);
}
.infoBlock {
  background-color: var(--white);
  color: var(--background);
  padding: 16px;
}
</style>
