
<template>
  <div>
    <div v-if='residents.length === 0'>
      No notable residents
    </div>
    <div v-if='residents.length !== loadedResidents.length && !error'>
      ... Loading
    </div>
    <ul
      v-if='residents.length === loadedResidents.length && residents.length !== 0'
      class='residents'
      >
      <li v-for='resident in loadedResidents' class='resident'>
        <router-link
          class='brand-link'
          :to="{path: '/people', query: {selected: resident.id}}"
          >
          {{resident.name}}
        </router-link>
      </li>
    </ul>
    <div v-if='error'>
      Error loading
    </div>
  </div>
</template>

<script>
import { getPerson } from '../../utils/api.js'
export default {
  props: {
    residents: Array
  },
  data: () => ({
    error: false,
    loadedResidents: []
  }),
  mounted: function () {
    this.subscriptions = []
    this.resetThenFetch()
  },
  beforeDestroy: function () {
    this.subscriptions.forEach(cancelable => {
      cancelable.unsubscribe()
    })
  },
  watch: {
    residents: function() {
      this.resetThenFetch()
    }
  },
  methods: {
    resetThenFetch: function () {
      this.loadedResidents = []
      this.error = false
      this.fetchResidents()
    },
    fetchResidents: function () {
      this.residents.forEach((residentUrl) => {
        const number = residentUrl.match(/[0-9]+/)
        this.fetchResident(number)
      })
    },
    fetchResident: function (number) {
      this.subscriptions.push(
        getPerson(number).subscribe(
          (results) => {
            this.loadedResidents = [...this.loadedResidents, results]
          },
          (err) => {
            this.error = true
            console.error(err)
          }
        )
      )

    }
  }
}
</script>

<style scoped>
.residents {
  margin: 0px;
  padding: 0px;
}

.resident {
  list-style-type: none;
}
</style>
