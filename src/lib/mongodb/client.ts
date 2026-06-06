import { MongoClient, Db, type Document, type Collection } from 'mongodb'

const uri = process.env.MONGODB_URI!
const dbName = process.env.MONGODB_DB || 'eventpilot'

let cachedClient: MongoClient | null = null
let cachedDb: Db | null = null

export async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb }
  }

  const client = new MongoClient(uri)
  await client.connect()
  const db = client.db(dbName)

  cachedClient = client
  cachedDb = db

  return { client, db }
}

export async function getCollection<T extends Document = Document>(
  collectionName: string
): Promise<Collection<T>> {
  const { db } = await connectToDatabase()
  return db.collection<T>(collectionName)
}