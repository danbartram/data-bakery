const { NamedId } = require('data-bakery')

module.exports = async () => ({
  user: [
    { id: new NamedId('helloWorld'), email: 'hello@world.com' },
  ],
})
