const db = require('../database');

// TODO test
module.exports = function (Posts) {
    Posts.getPidsByContent = async function (content) {
        assert(typeof content == "string");
        
        
        // Presumably returns an array of pids
        const pids = await db.scan({ match: `posts:pid:*` });    
        const filteredPids = []

        for (let i = 0; i < pids.length; i++) {
            // From src/socket.io/helpers.js
            const postData = await Posts.getPostFields(pids[i], ['content'])
            
            // Returns a postObj with a content field
            const postObj = await Promise.all([
                posts.parsePost(postData),
            ]);
            
            // Manually uses string comparisons to check if the post has the included phrase 
            if (postObj.content.includes(content)) {
                filteredPids.push(pids[i])
            }
        }
        assert(Array.isArray(filteredPids))
        return filteredPids

    }
}


        // Approach 1:
        
        // Get all posts, using db.scan?

        // const postData = await posts.getPostFields(pid, ['tid', 'uid', 'content']);

        // const [userData, topicTitle, postObj] = await Promise.all([
        //     user.getUserFields(fromuid, ['username']),
        //     topics.getTopicField(postData.tid, 'title'), NOT NEEDED
        //     posts.parsePost(postData),
        // ]);

        // postObj.content




        // filter manually by looping and checking contents?

        // Approach 2:
        // filterAndSort?
        // searchInContent?
