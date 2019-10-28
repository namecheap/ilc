<template>
  <div>
    <div>
      New Todo
      <input v-model='newTodo' @keyup.enter='addTodo(newTodo)'>
    </div>
    <div>
      Filters
      <button @click="updateFilter('ALL')">All</button>
      <button @click="updateFilter('DONE')">Done</button>
      <button @click="updateFilter('NOT_DONE')">Not Done</button>
    </div>
    <div>
      Filtered Todos
      <div v-for='todo in filteredTodos'>
        <div class='todo'>
          name: {{todo.name}}
          <button @click="toggleTodoDoneById(todo.id)">Toggle Status</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { uniqueId, findIndex } from 'lodash'
export default {
  data: () => ({
    newTodo: '',
    allTodos: [
      {id: 1, done: false, name: 'sleep'},
      {id: 2, done: false, name: 'eat'},
      {id: 3, done: true, name: 'walk'},
    ],
    filter: 'ALL',
  }),
  computed: {
    filteredTodos: function () {
      if (this.filter === 'ALL') {
        return this.allTodos
      } else {
        const done = this.filter === 'DONE'
        return this.allTodos.filter(todo => todo.done === done)
      }
    }
  },
  methods: {
    addTodo: function (newTodo) {
      this.allTodos.push({
        id: uniqueId('planet_todo_'),
        name: newTodo,
        done: false
      })
      this.newTodo = ''
    },
    toggleTodoDoneById: function (id) {
      const todoIndex = findIndex(this.allTodos, todo => todo.id === id)
      this.allTodos[todoIndex].done = !this.allTodos[todoIndex].done
    },
    updateFilter: function (newFilterValue) {
      this.filter = newFilterValue
    }
  }
}
</script>

<style scoped>
</style>
