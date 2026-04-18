import { createRouter, createWebHistory } from 'vue-router'
import DashboardPage from '../views/DashboardPage.vue'
import OrgsPage from '../views/OrgsPage.vue'
import RetrievePage from '../views/RetrievePage.vue'
import DeployPage from '../views/DeployPage.vue'
import HistoryPage from '../views/HistoryPage.vue'
import NotFoundPage from '../views/NotFoundPage.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'dashboard', component: DashboardPage },
    { path: '/orgs', name: 'orgs', component: OrgsPage },
    { path: '/retrieve', name: 'retrieve', component: RetrievePage },
    { path: '/compare', name: 'compare', component: () => import('../views/ComparePage.vue') },
    { path: '/deploy', name: 'deploy', component: DeployPage },
    { path: '/history', name: 'history', component: HistoryPage },
    { path: '/:pathMatch(.*)*', name: 'not-found', component: NotFoundPage },
  ],
})

export default router
