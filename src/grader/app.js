import Vue from 'vue'
import VTooltip from 'v-tooltip'
Vue.use(VTooltip)

import GradeTable from './GradeTable.vue'

import { DefaultCriterion, CustomCriterion, Grade } from './grade-schema.js'

let app = new Vue({
  el: '#app',
  template: `
    <grade-table
        :criteria="criteria"
        :grades="grades">
    </grade-table>
  `,
  data: {
    criteria: [],
    grades: []
  },
  components: {
    GradeTable
  }
})

//// For example:

let criterionA = new DefaultCriterion("COMMENTS")
let criterionB = new DefaultCriterion("WORDS")

app.criteria.push(criterionA)
app.criteria.push(criterionB)

let gradeA = new Grade('1', "Very good", 4)
let gradeB = new Grade('2', "Good", 3)
let gradeC = new Grade('3', "Fair", 2)

gradeA.setThreshold(criterionA.id, 3)
gradeA.setThreshold(criterionB.id, 60)
gradeB.setThreshold(criterionA.id, 2)
gradeB.setThreshold(criterionB.id, 40)
gradeC.setThreshold(criterionA.id, 1)
gradeC.setThreshold(criterionB.id, 15)

app.grades.push(gradeA)
app.grades.push(gradeB)
app.grades.push(gradeC)

//// ... end example