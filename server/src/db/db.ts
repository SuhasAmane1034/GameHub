import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const DB_FILE = path.resolve('db.json');
let useMongoDB = false;

// Global memory state for JSON fallback
let jsonDb: { [collection: string]: any[] } = {};

// Load JSON db from file
const loadJsonDb = () => {
  if (fs.existsSync(DB_FILE)) {
    try {
      const data = fs.readFileSync(DB_FILE, 'utf8');
      jsonDb = JSON.parse(data);
    } catch (err) {
      console.error('Failed to parse db.json, starting fresh', err);
      jsonDb = {};
    }
  } else {
    jsonDb = {};
  }
};

// Save JSON db to file
const saveJsonDb = () => {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(jsonDb, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to write to db.json', err);
  }
};

// Initialize database connection
export const initDatabase = async () => {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/gamehub';
  const redactedUri = mongoUri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
  console.log(`Connecting to database at URI: ${redactedUri}`);
  
  try {
    // Attempt connecting to MongoDB with a 5-second timeout for cloud connections
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });
    useMongoDB = true;
    console.log('🚀 Connected to MongoDB successfully.');
  } catch (err: any) {
    console.warn('⚠️ MongoDB connection failed:', err.message || err);
    console.warn('Falling back to local JSON database (zero-config mode).');
    useMongoDB = false;
    loadJsonDb();
  }
};

// Generic type-safe Model class mimicking Mongoose operations for JSON DB fallback
class JSONModel<T extends { _id?: string; createdAt?: string; updatedAt?: string }> {
  collectionName: string;
  defaultData: T[];

  constructor(collectionName: string, defaultData: T[] = []) {
    this.collectionName = collectionName;
    this.defaultData = defaultData;
    
    // Seed initial data if collection is empty
    if (!jsonDb[this.collectionName]) {
      jsonDb[this.collectionName] = [];
    }
    if (jsonDb[this.collectionName].length === 0 && defaultData.length > 0) {
      jsonDb[this.collectionName] = [...defaultData];
      saveJsonDb();
    }
  }

  private getItems(): T[] {
    if (!jsonDb[this.collectionName]) {
      jsonDb[this.collectionName] = [];
    }
    return jsonDb[this.collectionName];
  }

  private matches(item: any, filter: any): boolean {
    if (!filter) return true;
    for (const key in filter) {
      if (filter[key] && typeof filter[key] === 'object' && !Array.isArray(filter[key])) {
        // Handle basic operators like $regex, $in, $gte, etc.
        const ops = filter[key];
        if ('$regex' in ops) {
          const regex = new RegExp(ops.$regex, ops.$options || '');
          if (!regex.test(item[key] || '')) return false;
        } else if ('$in' in ops) {
          if (!ops.$in.includes(item[key])) return false;
        } else if ('$gte' in ops) {
          if (item[key] < ops.$gte) return false;
        } else if ('$lte' in ops) {
          if (item[key] > ops.$lte) return false;
        }
      } else {
        // Direct equality
        if (item[key] !== filter[key]) return false;
      }
    }
    return true;
  }

  async find(filter: any = {}): Promise<T[]> {
    const items = this.getItems();
    return items.filter(item => this.matches(item, filter));
  }

  async findOne(filter: any = {}): Promise<T | null> {
    const items = this.getItems();
    const found = items.find(item => this.matches(item, filter));
    return found || null;
  }

  async findById(id: string): Promise<T | null> {
    const items = this.getItems();
    const found = items.find(item => item._id === id);
    return found || null;
  }

  async create(data: Partial<T>): Promise<T> {
    const items = this.getItems();
    const now = new Date().toISOString();
    const newItem = {
      _id: crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
      ...data,
    } as unknown as T;
    
    items.push(newItem);
    saveJsonDb();
    return newItem;
  }

  async findByIdAndUpdate(id: string, update: any, options: { new?: boolean } = {}): Promise<T | null> {
    const items = this.getItems();
    const index = items.findIndex(item => item._id === id);
    if (index === -1) return null;

    const currentItem = items[index];
    const now = new Date().toISOString();
    
    // Check if it is a standard $set operations or a flat object update
    const updateData = update.$set ? { ...update.$set } : { ...update };
    
    // Filter out other operators if they exist (like $push)
    for (const key in update) {
      if (key.startsWith('$') && key !== '$set') {
        if (key === '$push') {
          for (const pKey in update.$push) {
            const arr = (currentItem as any)[pKey] || [];
            if (Array.isArray(arr)) {
              arr.push(update.$push[pKey]);
              updateData[pKey] = arr;
            }
          }
        }
      }
    }

    const updatedItem = {
      ...currentItem,
      ...updateData,
      updatedAt: now,
    };

    items[index] = updatedItem;
    saveJsonDb();
    return updatedItem;
  }

  async findByIdAndDelete(id: string): Promise<T | null> {
    const items = this.getItems();
    const index = items.findIndex(item => item._id === id);
    if (index === -1) return null;
    
    const deleted = items[index];
    items.splice(index, 1);
    saveJsonDb();
    return deleted;
  }

  async countDocuments(filter: any = {}): Promise<number> {
    const items = this.getItems();
    return items.filter(item => this.matches(item, filter)).length;
  }

  async deleteMany(filter: any = {}): Promise<{ deletedCount: number }> {
    const items = this.getItems();
    const initialCount = items.length;
    const remaining = items.filter(item => !this.matches(item, filter));
    jsonDb[this.collectionName] = remaining;
    saveJsonDb();
    return { deletedCount: initialCount - remaining.length };
  }

  async updateMany(filter: any, update: any): Promise<{ modifiedCount: number }> {
    const items = this.getItems();
    let modifiedCount = 0;
    const updateData = update.$set ? update.$set : update;
    
    const updated = items.map(item => {
      if (this.matches(item, filter)) {
        modifiedCount++;
        return {
          ...item,
          ...updateData,
          updatedAt: new Date().toISOString(),
        };
      }
      return item;
    });

    jsonDb[this.collectionName] = updated;
    saveJsonDb();
    return { modifiedCount };
  }
}

// Wrapper function that creates a Mongoose Model OR a JSONModel based on connection status
export const createDataModel = <T extends { _id?: string; createdAt?: string; updatedAt?: string }>(
  name: string,
  mongooseSchema: mongoose.Schema<any>,
  initialData: T[] = []
) => {
  // Define mongoose model
  const MongooseModel = mongoose.model(name, mongooseSchema);
  
  // Define custom json model proxy
  const jsonModel = new JSONModel<T>(name, initialData);

  // Return a proxy that directs methods and instantiation to Mongoose or the Local JSON DB
  const proxy = new Proxy(MongooseModel, {
    get: (target, prop) => {
      if (useMongoDB) {
        // Route to mongoose model
        return (MongooseModel as any)[prop];
      } else {
        // Route to JSON file database
        return (jsonModel as any)[prop];
      }
    },
    construct: (target, args) => {
      if (useMongoDB) {
        return Reflect.construct(MongooseModel, args);
      } else {
        // In local mode, return a plain object mimicking the model instance
        const data = args[0] || {};
        return {
          _id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          ...data,
          save: async function() {
            return this;
          }
        } as any;
      }
    }
  });

  return proxy as unknown as mongoose.Model<any> & JSONModel<T>;
};
