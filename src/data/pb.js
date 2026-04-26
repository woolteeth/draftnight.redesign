import PocketBase from 'pocketbase'

const pb = new PocketBase(
  import.meta.env.DEV
    ? 'http://localhost:5173'
    : 'https://ff.woolteeth.com'
)

export default pb