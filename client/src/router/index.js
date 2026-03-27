import { createRouter, createWebHistory } from 'vue-router'
import DashboardPage from '../views/DashboardPage.vue'
import OrgsPage from '../views/OrgsPage.vue'
import RetrievePage from '../views/RetrievePage.vue'
import DeployPage from '../views/DeployPage.vue'
import HistoryPage from '../views/HistoryPage.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'dashboard', component: DashboardPage },
    { path: '/orgs', name: 'orgs', component: OrgsPage },
    { path: '/retrieve', name: 'retrieve', component: RetrievePage },
    { path: '/deploy', name: 'deploy', component: DeployPage },
    { path: '/history', name: 'history', component: HistoryPage },
  ],
})

export default router
