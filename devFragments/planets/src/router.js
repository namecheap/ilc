import VueRouter from 'vue-router'
import PlanetPage from './planet-page.vue'
import Attributes from './selected-planet/info-tabs/attributes.vue'
import People from './selected-planet/info-tabs/people.vue'
import Todo from './todo/todo.vue'

const routes = [
  {
    path: '/planets',
    component: PlanetPage,
  },
  {
    path: '/planets/:id',
    component: PlanetPage,
    children: [
      {
        name: 'attributes',
        path: 'attributes',
        component: Attributes,
        props: true,
      },
      {
        name: 'people',
        path: 'people',
        component: People,
        props: true,
      },
      {
        name: 'todo',
        path: 'todo',
        component: Todo,
      }
    ]
  }
]

const router = new VueRouter({mode: 'history', routes})

export default router
