<template>
  <div class="rootDiv">
    <div class='left'>
      <planet-list
        :loading='loading'
        :next-page='nextPage'
        :planets='planets'
        @fetchPlanets='fetch'
      >
      </planet-list>
    </div>
    <div class='right'>
      <maybe-selected
        v-bind:selectedPlanet='selectedPlanet'
      >
      </maybe-selected>
    </div>
  </div>
</template>

<script>
import PlanetList from './planet-list/planet-list.vue'
import MaybeSelected from './selected-planet/maybe-selected.vue'
import { getPlanets } from './utils/api.js'
import { find } from 'lodash'
export default {
  data: () => ({
    planets: [],
    loading: false,
    nextPage: true,
  }),
  components: {
    PlanetList,
    MaybeSelected,
  },
  mounted: function () {
    this.subscriptions = []
    this.pageNum = 1
    this.fetch()
  },
  computed: {
    selectedPlanet: function () {
      const selected = this.$route.params.id
      const found = find(this.planets, (planet) => planet.id === selected)
      if (found !== undefined) {
        return found
      }
    }
  },
  beforeDestroy: function () {
    this.subscriptions.forEach(cancelable => {
      cancelable.unsubscribe()
    })
  },
  methods: {
    fetchWithNum: function (page) {
      this.fetch(page)
    },
    fetch: function (page = this.pageNum) {
      this.loading = true
      this.subscriptions.push(getPlanets(page).subscribe(
        (results) => {
          this.planets = [...this.planets, ...results.results]
          this.nextPage = !!results.next
          this.loading = false
          this.pageNum = this.pageNum + 1
        },
        (err) => {
          this.loading = false
          console.error(err)
        }
      ))
    }
  }
}
</script>

<style scoped>
.rootDiv {
  display: flex;
}

.left {
  padding: 24px;
  width: 30%;
}

.right {
  width: 70%;
  border-left: 2px solid var(--white);
  padding: 24px;
}
</style>
