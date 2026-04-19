import PocketBase from 'pocketbase'

const pb = new PocketBase(
  import.meta.env.DEV
    ? 'http://localhost:5174'
    : 'https://ff.woolteeth.com'
)

export default pb