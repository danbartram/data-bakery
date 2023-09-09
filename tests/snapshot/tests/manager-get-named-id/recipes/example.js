const { NamedId, getNamedId } = require('data-bakery')

module.exports = async ({ manager }) => ({
  user: [
    { id: new NamedId('helloWorld'), email: 'hello@world.com' },
  ],
  user_extra: [
    {
      id: getNamedId('user', 'helloWorld'),
      json: JSON.stringify({
        generatedId: `${manager.getNamedId('user', 'helloWorld')}-static-prefix`,
      }),
    },
  ],
})
