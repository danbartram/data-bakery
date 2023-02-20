const { AutoIncId, NamedId, getNamedId } = require('data-bakery')

module.exports = {
  user: [
    { id: new AutoIncId(), email: 'hi@there.com', firstName: 'Eric' },
    { id: new NamedId('helloWorld'), email: 'hello@world.com' },
  ],
  orders: [
    { id: 100, userId: getNamedId('user', 'helloWorld'), amount: 5000 },
    { id: 101, userId: getNamedId('user', 'helloWorld'), amount: 15000 },
  ],
}
