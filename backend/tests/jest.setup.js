// Silencia los logs de dotenvx durante los tests
const originalLog = console.log
console.log = (...args) => {
  if (typeof args[0] === 'string' && args[0].includes('injected env')) return
  originalLog(...args)
}

// Los tests deben correr con cooldown habilitado independientemente del .env
process.env.RACE_COOLDOWN_MINUTES = '60'
