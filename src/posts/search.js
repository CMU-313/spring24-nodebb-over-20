'use strict'

const db = require('../database')

module.exports = function (Posts) {
    Posts.getPidsByContent = async function (content) {
        console.assert(typeof content === 'string')

        // Presumably returns an array of pids
        const pids = await db.scan({ match: 'posts:pid:*' })
        const filteredPids = []

        for (let i = 0; i < pids.length; i++) {
            // From src/socket.io/helpers.js
            const postData = Posts.getPostFields(pids[i], ['content'])

            // Returns a postObj with a content field
            const postObj = Promise.all([Posts.parsePost(postData)])

            // Manually uses string comparisons to check if the post has the included phrase
            if (postObj.content.includes(content)) {
                filteredPids.push(pids[i])
            }
        }

        console.assert(Array.isArray(filteredPids))
        return filteredPids
    }
}
