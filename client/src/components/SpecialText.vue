<script setup>
import { ref, watch, onUnmounted, computed } from 'vue'

const props = defineProps({
  text: { type: String, required: true },
  speed: { type: Number, default: 20 },
  delay: { type: Number, default: 0 },
  inView: { type: Boolean, default: false },
  once: { type: Boolean, default: true },
})

const RANDOM_CHARS = '_!X$0-+*#'

function getRandomChar(prevChar) {
  let char
  do {
    char = RANDOM_CHARS[Math.floor(Math.random() * RANDOM_CHARS.length)]
  } while (char === prevChar)
  return char
}

const containerRef = ref(null)
const isInView = ref(false)
const hasStarted = ref(!props.inView && props.delay <= 0)
const displayText = ref('\u00A0'.repeat(props.text.length))
const currentPhase = ref('phase1')
const animationStep = ref(0)

let intervalId = null
let startTimeoutId = null
let observer = null

const shouldAnimate = computed(() => (props.inView ? isInView.value : true))

function clearTimers() {
  if (intervalId) { clearInterval(intervalId); intervalId = null }
  if (startTimeoutId) { clearTimeout(startTimeoutId); startTimeoutId = null }
}

function startAnimation() {
  hasStarted.value = true
  displayText.value = '\u00A0'.repeat(props.text.length)
  currentPhase.value = 'phase1'
  animationStep.value = 0
}

function runPhase1() {
  const text = props.text
  const maxSteps = text.length * 2
  const currentLength = Math.min(animationStep.value + 1, text.length)

  const chars = []
  for (let i = 0; i < currentLength; i++) {
    const prevChar = i > 0 ? chars[i - 1] : undefined
    chars.push(getRandomChar(prevChar))
  }
  for (let i = currentLength; i < text.length; i++) {
    chars.push('\u00A0')
  }

  displayText.value = chars.join('')

  if (animationStep.value < maxSteps - 1) {
    animationStep.value++
  } else {
    currentPhase.value = 'phase2'
    animationStep.value = 0
  }
}

function runPhase2() {
  const text = props.text
  const revealedCount = Math.floor(animationStep.value / 2)
  const chars = []

  for (let i = 0; i < revealedCount && i < text.length; i++) {
    chars.push(text[i])
  }

  if (revealedCount < text.length) {
    chars.push(animationStep.value % 2 === 0 ? '_' : getRandomChar())
  }

  for (let i = chars.length; i < text.length; i++) {
    chars.push(getRandomChar())
  }

  displayText.value = chars.join('')

  if (animationStep.value < text.length * 2 - 1) {
    animationStep.value++
  } else {
    displayText.value = text
    if (intervalId) { clearInterval(intervalId); intervalId = null }
  }
}

function tick() {
  if (currentPhase.value === 'phase1') runPhase1()
  else runPhase2()
}

// Start animation when conditions are met
watch([shouldAnimate, () => hasStarted.value], ([shouldAnim, started]) => {
  if (shouldAnim && !started) {
    clearTimers()
    if (props.delay <= 0) {
      startAnimation()
    } else {
      startTimeoutId = setTimeout(() => {
        startTimeoutId = null
        startAnimation()
      }, props.delay * 1000)
    }
  }
}, { immediate: true })

// Run the interval when animation is active
watch([() => hasStarted.value, currentPhase, animationStep], () => {
  if (!hasStarted.value) return
  if (intervalId) clearInterval(intervalId)
  intervalId = setInterval(tick, props.speed)
}, { immediate: true })

// Reset on text change
watch(() => props.text, () => {
  if (hasStarted.value) {
    displayText.value = '\u00A0'.repeat(props.text.length)
    currentPhase.value = 'phase1'
    animationStep.value = 0
  }
})

// IntersectionObserver for inView
watch(containerRef, (el) => {
  if (observer) observer.disconnect()
  if (!props.inView || !el) return

  observer = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {
        isInView.value = true
        if (props.once) observer.disconnect()
      } else if (!props.once) {
        isInView.value = false
      }
    },
    { rootMargin: '-100px' }
  )
  observer.observe(el)
}, { immediate: true })

onUnmounted(() => {
  clearTimers()
  if (observer) observer.disconnect()
})
</script>

<template>
  <span ref="containerRef" class="inline-flex font-mono font-medium">
    {{ displayText }}
  </span>
</template>
