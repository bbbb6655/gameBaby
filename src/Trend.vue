<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
const props = defineProps({
  labels: Array,
  lines: Array,
  min: { type: Number, default: 0 },
  max: { type: Number, default: 100 },
  unit: { type: String, default: '' },
})
const canvas = ref()
let observer
function paint() {
  const el = canvas.value
  if (!el) return
  const { width, height } = el.getBoundingClientRect()
  if (!width || !height) return
  const dpi = devicePixelRatio || 1
  el.width = width * dpi
  el.height = height * dpi
  const ctx = el.getContext('2d')
  ctx.scale(dpi, dpi)
  const left = props.unit ? 52 : 40,
    top = 14,
    right = width - 16,
    bottom = height - 27
  const x = (index) => left + ((right - left) * index) / Math.max(1, props.labels.length - 1)
  const y = (value) => bottom - ((value - props.min) / (props.max - props.min)) * (bottom - top)
  ctx.font = '11px system-ui'
  ctx.lineWidth = 1
  for (let index = 0; index <= 4; index++) {
    const value = props.min + (index * (props.max - props.min)) / 4
    const py = y(value)
    ctx.strokeStyle = '#e8eee8'
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    ctx.moveTo(left, py)
    ctx.lineTo(right, py)
    ctx.stroke()
    ctx.fillStyle = '#65786b'
    ctx.textAlign = 'right'
    ctx.fillText(`${Number(value.toFixed(1))}${props.unit}`, left - 8, py + 4)
  }
  ctx.setLineDash([])
  ctx.textAlign = 'center'
  ctx.fillStyle = '#65786b'
  props.labels.forEach((label, index) => ctx.fillText(label, x(index), height - 6))
  props.lines.forEach((line, j) => {
    if (j === 0) {
      const gradient = ctx.createLinearGradient(0, top, 0, bottom)
      gradient.addColorStop(0, '#8ac9a851')
      gradient.addColorStop(1, '#8ac9a800')
      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.moveTo(x(0), bottom)
      line.values.forEach((value, index) => ctx.lineTo(x(index), y(value)))
      ctx.lineTo(x(line.values.length - 1), bottom)
      ctx.closePath()
      ctx.fill()
    }
    ctx.strokeStyle = line.color
    ctx.lineWidth = 2.4
    ctx.beginPath()
    line.values.forEach((value, index) =>
      index ? ctx.lineTo(x(index), y(value)) : ctx.moveTo(x(index), y(value)),
    )
    ctx.stroke()
    line.values.forEach((value, index) => {
      ctx.beginPath()
      ctx.arc(x(index), y(value), 3, 0, 2 * Math.PI)
      ctx.fillStyle = '#fff'
      ctx.fill()
      ctx.stroke()
    })
  })
}
onMounted(() => {
  observer = new ResizeObserver(paint)
  observer.observe(canvas.value)
  paint()
})
onBeforeUnmount(() => observer?.disconnect())
watch(props, paint, { deep: true })
</script>

<template>
  <div class="chart-legend">
    <span v-for="line in lines" :key="line.name"
      ><i :style="{ background: line.color }"></i>{{ line.name }}</span
    >
  </div>
  <canvas
    ref="canvas"
    class="trend"
    role="img"
    :aria-label="lines.map((line) => line.name).join('、') + '折线图'"
  ></canvas>
</template>
