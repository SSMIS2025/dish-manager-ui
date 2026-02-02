const Store = require('electron-store');

class AuthHandler {
  constructor() {
    this.store = new Store({
      name: 'sdb-auth',
      defaults: {
        users: [
          { id: '1', username: 'admin', password: 'admin123', isAdmin: true },
          { id: '2', username: 'user', password: 'user123', isAdmin: false },
          { id: '3', username: 'operator', password: 'op123', isAdmin: false }
        ]
      }
    });
  }

  verifyLogin(username, password) {
    if (!username || !password) {
      return { valid: false, isAdmin: false };
    }

    const users = this.store.get('users') || [];
    const user = users.find(u => u.username === username && u.password === password);

    if (user) {
      return { valid: true, isAdmin: user.isAdmin };
    }

    return { valid: false, isAdmin: false };
  }

  getUsers() {
    return this.store.get('users') || [];
  }

  addUser(userData) {
    const users = this.store.get('users') || [];
    const newUser = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      ...userData
    };
    users.push(newUser);
    this.store.set('users', users);
    return newUser;
  }

  updateUser(id, userData) {
    const users = this.store.get('users') || [];
    const index = users.findIndex(u => u.id === id);
    if (index === -1) return null;
    
    users[index] = { ...users[index], ...userData };
    this.store.set('users', users);
    return users[index];
  }

  deleteUser(id) {
    let users = this.store.get('users') || [];
    users = users.filter(u => u.id !== id);
    this.store.set('users', users);
    return true;
  }
}

module.exports = AuthHandler;
