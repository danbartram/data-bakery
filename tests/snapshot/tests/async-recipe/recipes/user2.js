const { NamedId } = require('data-bakery')

module.exports = async () => ({
  user: [
    { id: new NamedId('anotherHelloWorld'), email: 'another-hello@world.com' },
  ],
})
