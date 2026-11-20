<script setup>
import { computed } from 'vue'

const props = defineProps({ options: Array, fixedSchoolId: String })
const selection = defineModel({ type: Object, required: true })
const schoolId = computed(() => props.fixedSchoolId || selection.value.schoolId)
const schoolOptions = computed(() => [
  ...new Map(props.options.map((item) => [item.schoolId, item.school])),
])
const schoolClasses = computed(() => props.options.filter((item) => item.schoolId === schoolId.value))
const majors = computed(() => [...new Map(schoolClasses.value.map((item) => [item.majorId, item.major]))])
const majorClasses = computed(() =>
  schoolClasses.value.filter((item) => item.majorId === selection.value.majorId),
)
const cohorts = computed(() => [...new Set(majorClasses.value.map((item) => item.cohort))])
const classOptions = computed(() =>
  majorClasses.value.filter((item) => item.cohort === selection.value.cohort),
)

function chooseSchool(id) {
  selection.value = { schoolId: id, majorId: '', cohort: '', classId: '' }
}

function chooseMajor(id) {
  selection.value = { schoolId: schoolId.value, majorId: id, cohort: '', classId: '' }
}

function chooseCohort(cohort) {
  selection.value = { ...selection.value, cohort, classId: '' }
}
</script>

<template>
  <label v-if="!fixedSchoolId" class="field">
    学校
    <select aria-label="学校" :value="schoolId" required @change="chooseSchool($event.target.value)">
      <option value="">请选择学校</option>
      <option v-for="[id, name] in schoolOptions" :key="id" :value="id">{{ name }}</option>
    </select>
  </label>
  <label class="field">
    专业
    <select
      aria-label="专业"
      :value="selection.majorId"
      required
      :disabled="!schoolId"
      @change="chooseMajor($event.target.value)"
    >
      <option value="">请选择专业</option>
      <option v-for="[id, name] in majors" :key="id" :value="id">{{ name }}</option>
    </select>
  </label>
  <label class="field">
    届别
    <select
      aria-label="届别"
      :value="selection.cohort"
      required
      :disabled="!selection.majorId"
      @change="chooseCohort($event.target.value)"
    >
      <option value="">请选择届别</option>
      <option v-for="name in cohorts" :key="name" :value="name">{{ name }}</option>
    </select>
  </label>
  <label class="field">
    班级
    <select
      aria-label="班级"
      :value="selection.classId"
      required
      :disabled="!selection.cohort"
      @change="selection = { ...selection, classId: $event.target.value }"
    >
      <option value="">请选择班级</option>
      <option v-for="item in classOptions" :key="item.id" :value="item.id">{{ item.name }}</option>
    </select>
  </label>
</template>
