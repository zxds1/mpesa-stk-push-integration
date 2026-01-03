const fs = require('fs').promises;
const path = require('path');

class StorageService {
  constructor() {
    this.dataFile = path.join(__dirname, '..', 'transactions.json');
    this.transactions = [];
    this.loadData();
  }

  async loadData() {
    try {
      const data = await fs.readFile(this.dataFile, 'utf8');
      this.transactions = JSON.parse(data);
    } catch (error) {
      // File doesn't exist or is empty, start with empty array
      this.transactions = [];
    }
  }

  async saveData() {
    try {
      await fs.writeFile(this.dataFile, JSON.stringify(this.transactions, null, 2));
    } catch (error) {
      console.error('Error saving data:', error);
    }
  }

  async create(transaction) {
    const newTransaction = {
      ...transaction,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.transactions.push(newTransaction);
    await this.saveData();
    return newTransaction;
  }

  async findOne(query) {
    return this.transactions.find(t => {
      return Object.keys(query).every(key => t[key] === query[key]);
    });
  }

  async findOneAndUpdate(query, update, options = {}) {
    const index = this.transactions.findIndex(t => {
      return Object.keys(query).every(key => t[key] === query[key]);
    });
    if (index !== -1) {
      this.transactions[index] = {
        ...this.transactions[index],
        ...update,
        updatedAt: new Date().toISOString(),
      };
      await this.saveData();
      return this.transactions[index];
    }
    return null;
  }

  async find(query = {}) {
    return this.transactions.filter(t => {
      return Object.keys(query).every(key => t[key] === query[key]);
    });
  }
}

module.exports = new StorageService();